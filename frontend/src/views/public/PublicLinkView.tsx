import storageKeys from "@/config/constants/storageKeys";
import { useGetLinkDetails } from "@/hooks/queries";
import { SessionStorageService } from "@/lib/WebStorageService";
import { AxiosError } from "axios";
import { useEffect, useMemo } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";

const PublicLinkView = () => {
  const storage = useMemo(() => new SessionStorageService(), []);
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, error } = useGetLinkDetails({
    slug: slug || "",
  });

  useEffect(() => {
    if (isError && error instanceof AxiosError) {
      if (error.response?.status === 401) {
        // Link access requires authentication

        // Save redirect path to session storage
        const redirectPath = `${pathname}${search ? `?${search}` : ""}${
          hash ? `#${hash}` : ""
        }`;
        storage.setItem(storageKeys.AUTH.REDIRECT, redirectPath);

        //redirect to login
        navigate("/sign-in");
      }
    }
  }, [isError, error, pathname, search, hash, storage, navigate]);

  if (!slug) {
    return <Navigate to="/" />;
  }
  return <div>PublicLinkView</div>;
};

export default PublicLinkView;
