import { create } from "zustand";
import {
  generateSRPCredentials,
  generateSRPClientValues,
  verifyServerProof,
} from "@/lib/crypto/srp";
import { API, ApiRoutes } from "@/api";
import { User } from "@/types/auth";
import axios, { AxiosError } from "axios";
import { devOnly, isDevEnvironment } from "@/utils/dev";
import { generateKeyPair } from "@/lib/crypto/keyManager";
import { Keys } from "@/types/keys";
import { devtools } from "zustand/middleware";
import { CryptoBridge } from "@/lib/crypto/workers/CryptoBridge";
import bcrypt from "bcryptjs";
import {
  getLocalSessionKey,
  putLocalSessionKey,
} from "@/api/services/authService";

const cryptoBridge = CryptoBridge.getInstance();

export interface AuthStore {
  user: User | null;
  authenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  authInitialized: boolean;
  sessionKey: string | null;
  keys: Keys[] | null;
  primaryKeys: Keys | null;

  clearAuthError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  validateSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      user: null,
      authenticated: false,
      authLoading: true,
      authError: null,
      authInitialized: false,
      sessionKey: null,
      keys: null,
      primaryKeys: null,

      clearAuthError: () => set({ authError: null }),

      signIn: async (email, password) => {
        devOnly(() => console.log("Signing in with", email));
        set({ authLoading: true });
        try {
          const { data: challenge } = await API.post(ApiRoutes.auth.challenge, {
            identifier: email,
          });
          const { serverEphemeral, salt, SRPSessionID } = challenge.data;

          const { clientEphemeralBase64, clientProofBase64, secretBase64 } =
            await generateSRPClientValues(
              email,
              password,
              salt,
              serverEphemeral
            );

          const { data: signInResponse } = await API.post(
            ApiRoutes.auth.signIn,
            {
              clientEphemeral: clientEphemeralBase64,
              clientProof: clientProofBase64,
              SRPSessionID,
            }
          );

          const { serverProof } = signInResponse.data;

          const { isValid, sessionKeyBase64 } = verifyServerProof(
            email,
            password,
            salt,
            serverProof,
            serverEphemeral,
            secretBase64
          );

          if (!isValid) throw new Error("Invalid server proof");

          const { data: meResponse } = await API.get(ApiRoutes.user.me);
          const me = meResponse.data as User;

          const _primaryKeys = me.keys.find((key) => key.primary);

          const passphrase = bcrypt.hashSync(password, _primaryKeys?.salt);

          if (_primaryKeys) {
            const sessionKey = await cryptoBridge.initialize(
              me.id,
              _primaryKeys?.private_key || "",
              passphrase
            );

            await putLocalSessionKey({
              sessionKey,
            });
          }

          set({
            authenticated: true,
            user: me,
            keys: me.keys,
            primaryKeys: _primaryKeys || null,
            sessionKey: sessionKeyBase64,
            authError: null,
          });
        } catch (error) {
          if (error instanceof AxiosError && error.response?.data?.message) {
            set({
              authError: error?.response?.data?.message,
            });
          } else {
            devOnly(() => console.error(error));
            set({ authError: "Sign-in failed. Please try again." });
          }
        } finally {
          set({ authLoading: false });
        }
      },

      signOut: async () => {
        devOnly(() => console.log("Signing out"));
        try {
          await API.post(ApiRoutes.auth.signOut);
          const user = get().user;
          if (user) {
            await cryptoBridge.terminate(user.id);
          }
          set({
            authenticated: false,
            user: null,
            keys: null,
            primaryKeys: null,
            sessionKey: null,
          });
        } catch (error) {
          devOnly(() => console.error(error));
        }
      },

      signUp: async (email, password) => {
        devOnly(() => console.log("Signing up with", email));
        set({ authLoading: true });
        try {
          const credentials = await generateSRPCredentials(email, password);
          const {
            publicKey,
            privateKey,
            salt: keySalt,
          } = await generateKeyPair(password, email);

          await API.post(ApiRoutes.auth.register, {
            identifier: email,
            salt: credentials.saltBase64,
            verifier: credentials.verifierBase64,
            public_key: publicKey,
            private_key: privateKey,
            key_salt: keySalt,
          });

          await get().signIn(email, password);
        } catch (error) {
          if (error instanceof AxiosError && error.response?.data?.message) {
            set({
              authError: error?.response?.data?.message,
            });
          } else {
            devOnly(() => console.error(error));
            set({ authError: "Sign-in failed. Please try again." });
          }
        } finally {
          set({ authLoading: false });
        }
      },

      refreshUser: async () => {
        devOnly(() => console.log("Refreshing user"));
        try {
          const { data } = await API.get(ApiRoutes.user.me);
          const me = data.data as User;
          const primaryKeys = me.keys.find((key) => key.primary);
          set({
            user: me,
            keys: me.keys,
            primaryKeys: primaryKeys || null,
          });
        } catch (error) {
          devOnly(() => console.error("Failed to refresh user", error));
        }
      },

      validateSession: async () => {
        devOnly(() => console.log("Validating session"));

        try {
          /**
           * Attempt to refresh the session by making a request to the refresh endpoint.
           * If the session is valid, this will succeed and set the authenticated state to true.
           *
           */
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || ""}${
              ApiRoutes.auth.refresh
            }`,
            null,
            {
              withCredentials: true,
            }
          );
          await get().refreshUser(); // Refresh user data after validating session
          const sessionKey = await getLocalSessionKey();
          const user = get().user;
          if (user) {
            await cryptoBridge.initializeFromLocal(user.id, sessionKey);
          }
          set({ authenticated: true });
          devOnly(() => console.log("Session is valid, user authenticated"));
        } catch (error) {
          await get().signOut(); // Sign out if session validation fails
          devOnly(() => console.error("Session validation failed", error));
        } finally {
          devOnly(() => console.log("Auth initialization complete"));

          set({ authLoading: false, authInitialized: true }); // Mark the auth as initialized
        }
      },
    }),
    {
      name: "auth-store",
      enabled: isDevEnvironment(),
    }
  )
);
