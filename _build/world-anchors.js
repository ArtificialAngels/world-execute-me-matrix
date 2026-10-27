/* _build/world-anchors.js — the world's arc, keyed to the film's own times.
   Every param is a list of [seconds, value]; the sampler smoothsteps between. */
module.exports = {
  params: {
    /* how much the world still obeys its own rules */
    order: [[0, 1], [13, 1], [29.7, 1], [59, 0.92], [74, 0.86], [103, 0.72], [129, 0.5], [148, 0.36], [162, 0.24], [177, 0.12], [191, 0.06], [206, 0.02], [211.9, 0]],
    /* geometric disorder */
    chaos: [[0, 0.02], [13, 0.04], [29, 0.06], [59, 0.16], [74, 0.3], [103, 0.46], [129, 0.72], [148, 0.96], [162, 0.9], [177, 0.42], [191, 0.2], [206, 0.1], [211.9, 0.05]],
    /* 0 = cool screen light, 1 = body warmth */
    warm: [[0, 0.15], [6, 0.34], [13, 0.4], [29, 0.5], [59, 0.55], [74, 0.72], [103, 0.56], [129, 0.42], [148, 0.46], [162, 0.5], [177, 0.82], [191, 0.9], [206, 0.86], [211.9, 0.72]],
    /* the variable the machine should not have */
    love: [[0, 0], [100, 0], [116, 0.1], [129, 0.2], [148, 0.24], [162, 0.3], [177, 0.56], [184, 0.82], [190, 1], [211.9, 1]],
    /* the machine's own cool pen */
    trace: [[0, 0], [0.2, 0.42], [13, 0.5], [29, 0.6], [59, 0.7], [74, 0.76], [103, 0.6], [129, 0.82], [148, 1], [162, 1], [177, 0.16], [191, 0.1], [203, 0.2], [206, 0.55], [211.9, 0.25]],
    /* dust in the beam */
    dust: [[0, 0], [0.4, 0.5], [13, 0.62], [29, 0.5], [59, 0.46], [74, 0.52], [103, 0.3], [129, 0.52], [148, 1], [162, 0.9], [177, 0.36], [191, 0.3], [206, 0.22], [211.9, 0.1]],
    /* scorching on the wall */
    burn: [[0, 0], [129, 0], [148, 0.14], [162, 0.52], [177, 0.86], [191, 0.8], [206, 0.62], [211.9, 0.5]],
    /* how large the absence is */
    voidSize: [[0, 0], [103, 0], [110, 0.16], [116, 0.5], [129, 0.62], [148, 0.38], [162, 0.3], [177, 0.2], [191, 0.14], [211.9, 0.1]],
    /* wall age / damage */
    wallAge: [[0, 0.1], [59, 0.2], [103, 0.3], [129, 0.55], [148, 0.7], [177, 0.9], [211.9, 1]]
  },
  /* NO POINT LIGHT. The shadow-play lamp is gone: there is no lamp position to
     track, no distance, no falloff. What is left is a flat, lightless data space
     — every mark is emission, not reflection. The object keeps the keys so the
     plates that still read w.lamp compile, but the values are constant: centre
     of frame, unit intensity, no depth. */
  lamp: {
    x: [[0, 0], [211.9, 0]],
    y: [[0, 0], [211.9, 0]],
    z: [[0, 900], [211.9, 900]],
    lux: [[0, 0.8], [211.9, 0.8]],
    k: [[0, 0.3], [211.9, 0.3]]
  }
};
