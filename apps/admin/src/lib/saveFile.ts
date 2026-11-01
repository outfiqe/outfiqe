export const saveFile = (file: Blob, fileName: string) => {
  const fileUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = fileUrl;
  downloadLink.download = fileName;
  downloadLink.click();
  URL.revokeObjectURL(fileUrl);
};
