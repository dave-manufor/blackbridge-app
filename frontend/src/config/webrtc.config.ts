const webrtcConfig = {
  peerConnectionConfig: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
    sdpSemantics: "unified-plan",
    bundlePolicy: "max-bundle",
  } as RTCConfiguration,
  dataChannelConfig: {
    ordered: true,
  } as RTCDataChannelInit,
};

export default webrtcConfig;
