import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

export async function executeInAppDownload(url: string, filename: string): Promise<void> {
  try {
    toast.info(`Preparing ${filename}…`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file (${response.status})`);
    }

    const blob = await response.blob();

    if (Capacitor.isNativePlatform()) {
      // Convert blob to base64
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = window.btoa(binary);

      // Write to Cache (always accessible, no permission needed)
      let writeResult;
      try {
        writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
      } catch (writeErr) {
        console.error("Filesystem.writeFile to Cache failed:", writeErr);
        throw new Error("Could not write PDF to device storage.");
      }

      // Get the public URI for the saved file
      const fileUri = writeResult.uri;

      // Use Share to show the native "Open with / Save to Downloads" sheet
      // This is the correct Android pattern — lets the user save wherever they want
      try {
        await Share.share({
          title: filename,
          text: `Your ${filename} is ready`,
          url: fileUri,
          dialogTitle: `Save or open ${filename}`,
        });
      } catch (shareErr: any) {
        // User dismissed the share sheet — that's fine, file is still in cache
        // Only re-throw if it's a real error (not a cancellation)
        const msg = shareErr?.message ?? "";
        if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("abort")) {
          console.warn("Share sheet error:", shareErr);
        }
      }

      toast.success(`${filename} ready — save it from the share menu`);
    } else {
      // Web browser: trigger anchor-click download
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
