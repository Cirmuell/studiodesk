import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

export async function executeInAppDownload(url: string, filename: string): Promise<void> {
  try {
    toast.info(`Preparing ${filename}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file (${response.status})`);
    }

    const blob = await response.blob();

    if (Capacitor.isNativePlatform()) {
      const arrayBuffer = await blob.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = window.btoa(binary);

      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      if (savedFile.uri) {
        await Share.share({
          title: filename,
          text: `Downloaded ${filename}`,
          url: savedFile.uri,
          dialogTitle: `Save or Share ${filename}`,
        });
      }
      toast.success(`${filename} saved!`);
    } else {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 300);

      toast.success(`${filename} downloaded!`);
    }
  } catch (error: any) {
    console.error("In-app download error:", error);
    toast.error(error?.message || "Failed to download file");
  }
}
