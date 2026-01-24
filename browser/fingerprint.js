export async function injectFingerprint(page, fp) {
  await page.evaluateOnNewDocument(fp => {
    // Navigator overrides
    Object.defineProperty(navigator, "platform", { get: () => fp.platform });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => fp.hardwareConcurrency });
    Object.defineProperty(navigator, "deviceMemory", { get: () => fp.deviceMemory });

    // Canvas noise
    const orig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () {
      const ctx = this.getContext("2d");
      ctx.fillStyle = "rgba(1,1,1,0.01)";
      ctx.fillRect(0,0,1,1);
      return orig.apply(this, arguments);
    };

    // WebGL vendor / renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return fp.webgl_vendor;
      if (param === 37446) return fp.webgl_renderer;
      return getParameter.call(this, param);
    };
  }, fp);
}
