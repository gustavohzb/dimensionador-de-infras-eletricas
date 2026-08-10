// Serializa um <svg> da tela num PNG e dispara o download. Só o elemento SVG
// entra — o que estiver em HTML ao redor dele (a legenda de vias, por exemplo)
// não aparece na imagem. É por isso que a legenda de circuitos é desenhada
// dentro do SVG.
export function exportarSvgPng(svg, filename, dark = false) {
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(source)));
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    // Fundo opaco: PNG transparente fica ilegível colado num documento claro.
    ctx.fillStyle = dark ? "#14181c" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
}
