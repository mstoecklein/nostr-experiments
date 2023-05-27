export default function () {
  Alpine.data("saveStorage", () => ({
    onExport() {
      const nostrSettings = JSON.parse(localStorage.getItem("nostrSettings"));
      const relays = JSON.parse(localStorage.getItem("relays"));
      const blob = new Blob(
        [
          JSON.stringify({
            nostrSettings,
            relays,
          }),
        ],
        { type: "application/json" }
      );
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
          localStorage.setItem(
            "nostrSettings",
            JSON.stringify(data.nostrSettings)
          );
          localStorage.setItem("relays", JSON.stringify(data.relays));
          window.location.reload();
        };
        reader.readAsText(file);
      };
      input.click();
    },
  }));
}
