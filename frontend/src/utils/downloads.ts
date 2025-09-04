import streamSaver from "streamsaver";

export const saveBlob = (blob: Blob, fileName: string, mime: string) => {
  console.log("Saving blob:", { blob, fileName, mime });
  // extract user agent
  const userAgent = window.navigator.userAgent.toLowerCase();
  const ios = /iphone|ipod|ipad|crios|fxios/.test(userAgent);
  const chrome = /crios/.test(userAgent);

  // create blob
  // It is necessary to create a new blob object with mime-type explicitly set
  // otherwise only Chrome works like it should
  const safeBlob = new Blob([blob], { type: mime });
  const blobURL = window.URL.createObjectURL(safeBlob);

  // if its ipad or iphone
  if (ios) {
    const reader = new FileReader();
    reader.onload = () => {
      if (chrome) {
        window.open(blobURL);
      } else {
        window.location.href = blobURL;
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  // Other browsers
  // Create a link pointing to the ObjectURL containing the blob
  const link = document.createElement("a");
  link.href = blobURL;
  link.style.display = "none";
  link.setAttribute("download", fileName);
  // Safari thinks _blank anchor are pop ups. We only want to set _blank
  // target if the browser does not support the HTML5 download attribute.
  // This allows you to download files in desktop safari if pop up blocking
  // is enabled.
  if (typeof link.download === "undefined") {
    link.setAttribute("target", "_blank");
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    // For Firefox it is necessary to delay revoking the ObjectURL
    window.URL.revokeObjectURL(blobURL);
  }, 100);
};

export const saveBlobWithStream = async (
  blob: Blob,
  fileName: string,
  mime: string
) => {
  const safeBlob = new Blob([blob], { type: mime });
  const stream = safeBlob.stream();

  // Create a file stream with suggested name
  const fileStream = streamSaver.createWriteStream(fileName);

  // Pipe the data into it
  const writer = fileStream.getWriter();

  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await writer.write(value);
  }

  await writer.close();
  console.log("✅ File saved via StreamSaver:", fileName);
};
