export default function () {
  Alpine.data("saveStorage", () => ({
    onExport() {
      const settings = JSON.parse(localStorage.getItem("settings"));
      const relays = JSON.parse(localStorage.getItem("relays"));
      const blob = new Blob([JSON.stringify({ settings, relays })], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nostr-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    onImport() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = () => {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const data = JSON.parse(reader.result);
          localStorage.setItem("settings", JSON.stringify(data.settings));
          localStorage.setItem("relays", JSON.stringify(data.relays));
          window.location.reload();
        };
        reader.readAsText(file);
      };
      input.click();
    },
  }));
}
