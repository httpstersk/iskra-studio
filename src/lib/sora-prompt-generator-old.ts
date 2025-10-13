/**
 * Sora 2 Prompt Generator - HIGH INTENSITY EDITION
 * Generates explosive, creative video prompts with 1 CUT PER SECOND
 * Based on detailed image analysis following Sora 2 Prompting Guide
 */

interface PromptGenerationOptions {
  imageAnalysis: string;
  duration: number;
}

/**
 * Generates 4 INTENSE cinematic prompts for Sora 2 based on image analysis
 * Each prompt has EXACTLY 1 cut per second for maximum visual impact
 * Prompts are creative, dramatic, and push the boundaries of video generation
 */
export function generateSoraPromptsFromAnalysis(
  options: PromptGenerationOptions
): string[] {
  const { imageAnalysis, duration } = options;

  const prompts = [
    generateExplosiveEnergyPrompt(imageAnalysis, duration),
    generateKaleidoscopeRealityPrompt(imageAnalysis, duration),
    generateFashionStormPrompt(imageAnalysis, duration),
    generateTimeCollapsePrompt(imageAnalysis, duration),
  ];

  return prompts;
}

/**
 * Style 1: EXPLOSIVE ENERGY - Maximum intensity with rapid-fire cuts
 */
function generateExplosiveEnergyPrompt(
  analysis: string,
  duration: number
): string {
  return `
    Style: EXPLOSIVE commercial cinematography shot at 120fps with rapid 1-second cuts. Anamorphic 2.0x lens flares, razor-sharp focus mixed with motion blur streaks. Hyper-saturated color grade with crushed blacks and blown highlights. Every cut is a visual IMPACT.

    Reference Image Analysis:
    ${analysis}

    Creative Direction: Transform this image into a BURST of visual energy. Each second is a new angle, a new perspective, a new way to see the subject. Camera whips, zoom punches, orbital spins. Subject becomes the epicenter of controlled chaos—environment REACTS with particle bursts, light explosions, fabric storms, color shifts.

    Cinematography:
    Camera: ${duration} distinct shots with VIOLENT cuts—no gentle transitions
    Lens: 24mm wide to 85mm portrait; f/1.4 to f/2.8; focus pulls on every cut
    Lighting: Strobing key light, colored gels (cyan/magenta split), practical explosions
    Mood: RELENTLESS, visceral, heart-racing

    ${generateHighIntensityShotList(duration, "explosive", analysis)}

    Actions (Rapid-Fire):
    ${generateIntenseActions(duration, "explosive")}

    Background Sound:
    Bass drops, whoosh transitions, impact hits, rising tension, electronic pulse

    Camera Notes:
    Every cut should feel like a PUNCH. Lock focus instantly, no drifting. Maintain subject clarity while chaos surrounds. Use frame as weapon—tight crops then massive reveals.
  `;
}

/**
 * Style 2: KALEIDOSCOPE REALITY - Surreal, fractured perspectives
 */
function generateKaleidoscopeRealityPrompt(
  analysis: string,
  duration: number
): string {
  return `
    Style: Surreal psychological cinematography with kaleidoscopic cuts every second. Heavy chromatic aberration, prismatic lens effects, glitch artifacts. Color shifts from scene to scene (cool teal → hot magenta → toxic green → golden amber). Disorienting but BEAUTIFUL.

    Reference Image Analysis:
    ${analysis}

    Creative Direction: Reality SPLINTERS. Each second shows the same subject from an impossible angle or altered state. Mirrors multiply. Gravity questions itself. Colors invert. Time stutters. The image becomes a FEVER DREAM where every cut reveals a new facet of truth. Physics optional, visual poetry mandatory.

    Cinematography:
    Camera: ${duration} shots, NO angle repeated—Dutch tilts, inversions, reflections, distortions
    Lens: 28mm wide with barrel distortion; prism filters; kaleidoscope attachments
    Lighting: Contradictory sources that shouldn't coexist; colored practicals fighting each other
    Mood: Hypnotic, unsettling, mesmerizing, psychedelic

    ${generateHighIntensityShotList(duration, "kaleidoscope", analysis)}

    Actions (Reality-Bending):
    ${generateIntenseActions(duration, "kaleidoscope")}

    Background Sound:
    Reversed audio, pitch-bent tones, crystalline chimes, reality tearing, dimensional shifts

    Camera Notes:
    Each cut should disorient then intrigue. Subject remains recognizable but TRANSFORMED. Use symmetry, repetition, and visual echoes to create hypnotic rhythm.
  `;
}

/**
 * Style 3: FASHION STORM - High-fashion meets hurricane intensity
 */
function generateFashionStormPrompt(
  analysis: string,
  duration: number
): string {
  return `
    Style: ULTRA high-fashion editorial on STEROIDS. Shot with RED 8K at 60fps with 1-second rapid cuts. Razor-sharp digital capture, geometric light patterns, wind machine BLASTING. Every cut is a different runway angle. Bold color blocking with neon accents. Fashion photography meets action cinema.

    Reference Image Analysis:
    ${analysis}

    Creative Direction: Subject becomes FASHION WEAPON. Each second: new angle, new pose, new POWER moment. Wind activates hair and fabric into sculptural forms. Geometric light patterns slash across frame. Environment transforms into editorial abstract—concrete, glass, chrome, neon. Subject OWNS every millisecond.

    Cinematography:
    Camera: ${duration} editorial angles—profile whips, overhead drops, low hero shots, spinning reveals
    Lens: 50mm and 135mm primes; f/1.2 for bokeh; 24mm for dramatic distortion shots
    Lighting: Hard key from 45°, rim lights carving silhouette, colored spots (gold/electric blue)
    Mood: FIERCE, commanding, untouchable, iconic

    ${generateHighIntensityShotList(duration, "fashion", analysis)}

    Actions (Power Moves):
    ${generateIntenseActions(duration, "fashion")}

    Background Sound:
    Bass pulse, wind roar, fabric snap, heel strike, electronic stabs, atmospheric whoosh

    Camera Notes:
    Sharp cuts only. No soft transitions. Each frame could be magazine cover. Prioritize GEOMETRY—diagonal lines, triangular composition, leading lines to subject.
  `;
}

/**
 * Style 4: TIME COLLAPSE - Temporal fragmentation and reality bending
 */
function generateTimeCollapsePrompt(
  analysis: string,
  duration: number
): string {
  return `
    Style: TEMPORAL WARFARE cinematography. Mixed frame rates (12fps to 240fps) cutting every second. Time becomes NON-LINEAR—subject exists in multiple moments simultaneously. Speed ramps MID-SHOT. Light streaks. Motion trails. Past/present/future collapse into NOW. Each cut is a different time signature.

    Reference Image Analysis:
    ${analysis}

    Creative Direction: TIME BREAKS. Each 1-second cut shows temporal manipulation—freeze frames with moving backgrounds, hyper-speed with slow-motion subject, time-lapse environment with static figure. Subject becomes ANCHOR in temporal storm. Reality time-lapses around them. Shadows move wrong. Light sources accelerate through day-to-night in seconds. IMPOSSIBLE yet beautiful.

    Cinematography:
    Camera: ${duration} locked or slow-tracking positions—let TIME do the movement
    Lens: 35mm to 50mm; deep DOF to capture temporal layers throughout frame
    Lighting: Rapid natural progression—sunrise to sunset in ${duration} cuts
    Mood: Mind-bending, contemplative violence, beautiful impossible

    ${generateHighIntensityShotList(duration, "temporal", analysis)}

    Actions (Time-Defying):
    ${generateIntenseActions(duration, "temporal")}

    Background Sound:
    Time-stretch whooshes, clock mechanisms breaking, temporal displacement tones, accelerated ambience

    Camera Notes:
    Each second is a TEMPORAL SLICE. Subject may be static while world rushes. Or subject moves normal speed while everything else is wrong. Time is the special effect.
  `;
}

/**
 * Generates HIGH-INTENSITY shot list with EXACTLY 1 cut per second
 * Each shot is specific, dramatic, and visually distinct
 */
function generateHighIntensityShotList(
  duration: number,
  style: string,
  _analysis: string
): string {
  const numShots = duration; // 1 cut per second
  let shotList = `Optimized Shot List (${duration}s total, ${numShots} RAPID CUTS):\n`;

  for (let i = 0; i < numShots; i++) {
    const startTime = i.toFixed(2);
    const endTime = (i + 1).toFixed(2);
    const shotNum = i + 1;

    let shotDescription = "";
    switch (style) {
      case "explosive":
        shotDescription = getExplosiveShot(shotNum, numShots);
        break;
      case "kaleidoscope":
        shotDescription = getKaleidoscopeShot(shotNum, numShots);
        break;
      case "fashion":
        shotDescription = getFashionShot(shotNum, numShots);
        break;
      case "temporal":
        shotDescription = getTemporalShot(shotNum, numShots);
        break;
    }

    shotList += `${startTime}–${endTime} — ${shotDescription}\n`;
  }

  return shotList.trim();
}

/**
 * EXPLOSIVE ENERGY shots - maximum visual impact
 */
function getExplosiveShot(shotNum: number, _total: number): string {
  const explosiveShots = [
    'Shot 1: "PUNCH IN" (extreme close-up, instant zoom)\nVIOLENT zoom into subject\'s most striking feature. Strobe flash. Motion blur trails. Background explodes into streaks.',
    'Shot 2: "ORBITAL ASSAULT" (wide, 180° barrel roll)\nCamera SPINS around subject at high speed. Environment becomes circular blur. Subject sharp at center. Particle burst.',
    'Shot 3: "DETAIL STRIKE" (macro, locked)\nFREEZE on texture detail—eye, fabric, skin, jewelry. Perfect clarity. Background out of focus. Single colored light slash.',
    'Shot 4: "OVERHEAD DROP" (top-down, descending)\nCamera PLUNGES from above. Subject centered. Shadows radiate outward. Geometric light patterns.',
    'Shot 5: "PROFILE WHIP" (side angle, whip pan)\nCAMERA WHIPS 90° to profile. Motion blur transition. LOCKS sharp. Colored gel lighting (magenta/cyan split).',
    'Shot 6: "LOW HERO" (low angle, push up)\nCamera on ground looking UP. Subject towers. Dramatic perspective. Backlight creates silhouette halo.',
    'Shot 7: "REFLECTION CHAOS" (mirror/glass angle)\nSubject through reflective surface. Multiple images. Fragmented reality. Light refractions.',
    'Shot 8: "PULL BACK REVEAL" (medium to wide, dolly out)\nRAPID pull reveals full environment. Subject small but commanding. Light rays converge.',
    'Shot 9: "DUTCH TILT ENERGY" (45° angle, rotating)\nFrame TILTED. Camera rotates through shot. World feels unstable. Subject remains focal point.',
    'Shot 10: "SLOW-MO EXPLOSION" (any angle, 240fps)\nTime SLOWS. Subject performs micro-gesture in detail. Fabric ripples. Hair floats. Particles suspend.',
    'Shot 11: "TRACKING PARALLEL" (side dolly, matching speed)\nCamera TRACKS alongside moving subject. Speed matched. Background streaks. Dynamic lines.',
    'Shot 12: "FINAL FLARE" (medium, lens flare takeover)\nSubject moves toward bright light source. Anamorphic flare CONSUMES frame. White-out exit.',
  ];

  return explosiveShots[Math.min(shotNum - 1, explosiveShots.length - 1)];
}

/**
 * KALEIDOSCOPE REALITY shots - surreal and disorienting
 */
function getKaleidoscopeShot(shotNum: number, _total: number): string {
  const kaleidoscopeShots = [
    'Shot 1: "THE UNCHANGED" (straight medium, static)\nSubject perfectly STILL. Normal framing. But something\'s wrong—background has subtle parallax drift.',
    'Shot 2: "MIRROR MULTIPLY" (symmetric split)\nSudden KALEIDOSCOPE effect. Subject appears 2-4 times in frame. Symmetrical. Color shift to inverted palette.',
    'Shot 3: "GRAVITY LIES" (inverted, 180° flip)\nWorld ROTATES upside down. Subject defies physics—standing on ceiling or floating. Depth flattens.',
    'Shot 4: "PRISM FRACTURE" (Dutch angle, chromatic aberration)\nFrame TILTED 45°. Heavy chromatic split (red/blue separation). Multiple exposure ghosting.',
    'Shot 5: "REFLECTION PARADOX" (mirror angle)\nSubject AND their reflection, but reflections don\'t match reality. Different pose or color.',
    'Shot 6: "RADIAL DISTORTION" (fisheye center)\nExtreme WIDE lens distortion. Subject at center, warped. Environment curves impossibly.',
    'Shot 7: "COLOR INVERSION" (any angle, color negative)\nColors FLIP to opposite. Skin tones alien. Background psychedelic. Disorienting but beautiful.',
    'Shot 8: "DOUBLE TIME" (split screen temporal)\nSame subject, same frame, TWO moments in time. Past and present coexist.',
    'Shot 9: "SPIRAL DESCENT" (rotating zoom)\nCamera SPIRALS inward while rotating. Vertigo effect. Subject at vortex center.',
    'Shot 10: "GLITCH ARTIFACT" (digital corruption)\nFrame GLITCHES. Datamosh effects. Subject fragments then reconstructs. Digital reality break.',
    'Shot 11: "PRISM RAINBOW" (light refraction)\nSubject through PRISM. Multiple colored versions. Spectral separation. Beautiful chaos.',
    'Shot 12: "COLLAPSE INWARD" (radial blur to center)\nEverything PULLS toward center. Radial motion blur. Subject eyes or hands at epicenter. Then: stillness.',
  ];

  return kaleidoscopeShots[Math.min(shotNum - 1, kaleidoscopeShots.length - 1)];
}

/**
 * FASHION STORM shots - editorial power moves
 */
function getFashionShot(shotNum: number, _total: number): string {
  const fashionShots = [
    'Shot 1: "ARRIVAL STATEMENT" (medium-wide, slow push)\nSubject EMERGES. Wind activates immediately. Hair and fabric begin flow. Single spotlight from 45° above.',
    'Shot 2: "PROFILE POWER" (90° side, whip pan)\nCAMERA WHIPS to perfect profile. LOCKS. Rim light carves silhouette. Geometric light pattern on background.',
    'Shot 3: "OVERHEAD GEOMETRY" (top-down, locked)\nDirect overhead shot. Subject looks up at camera. Symmetrical composition. Shadows form geometric patterns.',
    'Shot 4: "DETAIL WORSHIP" (extreme close-up, slow arc)\nMACRO on detail—jewelry catching light, fabric texture, eye reflection. Slow 30° arc. Bokeh background.',
    'Shot 5: "LOW ANGLE DOMINANCE" (ground level, looking up)\nCamera on FLOOR. Subject towers above. Power pose. Backlight creates rim glow. Commanding presence.',
    'Shot 6: "SPINNING REVEAL" (medium, 360° rotation)\nCamera ORBITS 360° around subject in one second. Subject center frame throughout. Wind constant.',
    'Shot 7: "BACK VIEW MYSTERY" (behind, slow approach)\nView from BEHIND. Camera slowly approaches. Subject\'s silhouette and form. Hair movement reveals shape.',
    'Shot 8: "DUTCH TILT EDGE" (45° angle, static)\nFrame TILTED dramatically. Creates tension. Subject diagonal across frame. Hard lighting from one side.',
    'Shot 9: "REFLECTION DOUBLE" (mirror/glass angle)\nSubject AND perfect reflection. Both sharp. Symmetry creates editorial aesthetic. Light source between.',
    'Shot 10: "FABRIC EXPLOSION" (medium, high-speed wind)\nWind machine MAXIMUM. Fabric becomes sculptural. Hair defies gravity. Frozen motion at peak.',
    'Shot 11: "SPOTLIGHT ISOLATION" (medium-close, single source)\nALL lights off except ONE. Subject isolated in darkness. Dramatic chiaroscuro. Face half-lit.',
    'Shot 12: "WALK-OFF EXIT" (wide, dolly back)\nSubject WALKS toward camera confidently. Camera pulls back matching speed. Geometric light panels behind. ICONIC.',
  ];

  return fashionShots[Math.min(shotNum - 1, fashionShots.length - 1)];
}

/**
 * TIME COLLAPSE shots - temporal manipulation
 */
function getTemporalShot(shotNum: number, _total: number): string {
  const temporalShots = [
    'Shot 1: "DAWN ACCELERATION" (locked wide, time-lapse sky)\nSubject moves NORMAL speed. Sky RUSHES from night to sunrise in 1 second. Light transforms dramatically.',
    'Shot 2: "SHADOW SPIN" (locked position, sun movement)\nSubject FROZEN. Sun arcs overhead rapidly. Shadow SPINS around them. Lighting changes mid-shot.',
    'Shot 3: "CROWD BLUR" (locked medium, people time-lapse)\nSubject STATIC. Background people become motion blur streaks rushing past. Subject is island in time stream.',
    'Shot 4: "SLOW SUBJECT FAST WORLD" (locked angle, mixed speeds)\nSubject moves SLOW MOTION. Everything else ACCELERATED. Clouds rush. Lights flicker. Time paradox.',
    'Shot 5: "REVERSE TIME" (any angle, backwards motion)\nEverything moves BACKWARDS. Water flows up. People walk in reverse. Subject moves forward. Wrong direction.',
    'Shot 6: "GOLDEN RUSH" (locked shot, light quality acceleration)\nLight quality transforms from NOON to GOLDEN HOUR in 1 second. Subject constant. Magic hour compressed.',
    'Shot 7: "NIGHT FALL" (locked angle, day to night)\nDAYLIGHT collapses to NIGHT. City lights spark on in sequence. Stars streak into position. Subject unchanged.',
    'Shot 8: "SPEED RAMP MID-SHOT" (any angle, variable frame rate)\nStarts 240fps slow-mo, RAMPS to 12fps accelerated within the shot. Time stutters. Surreal.',
    'Shot 9: "LIGHT TRAIL SUBJECT" (long exposure effect)\nSubject leaves MOTION TRAILS like long exposure. Every movement echoes. Past positions visible as ghosts.',
    'Shot 10: "FREEZE FRAME BACKGROUND" (subject moves, world frozen)\nSubject in MOTION. Everything else FROZEN. They move through suspended moment. Time stopped.',
    'Shot 11: "WEATHER ACCELERATION" (locked shot, conditions change)\nWeather TRANSFORMS. Clear to rain to fog to clear. In one second. Subject experiences all conditions.',
    'Shot 12: "TEMPORAL CONVERGENCE" (locked angle, multiple times)\nSame location. THREE versions of subject from different times appear in frame. Past/present/future collapse.',
  ];

  return temporalShots[Math.min(shotNum - 1, temporalShots.length - 1)];
}

/**
 * Generates specific, intense actions for each style
 */
function generateIntenseActions(duration: number, style: string): string {
  const numActions = Math.min(duration, 12);
  const actions: string[] = [];

  switch (style) {
    case "explosive":
      const explosiveActions = [
        "Second 1: Subject snaps to attention, eyes LOCK on camera",
        "Second 2: Head whips 90°, hair follows with delay, creates motion trail",
        "Second 3: Hand rises into frame, gesture SHARP and decisive",
        "Second 4: Body rotates, catches light, shadow transforms",
        "Second 5: Fabric FLARES as subject moves, wind catches material",
        "Second 6: Subject takes powerful step forward, ground-level intensity",
        "Second 7: Expression shifts—neutral to intense—micro-expressions rapid",
        "Second 8: Arms extend, creating geometric shape with body",
        "Second 9: Subject spins partial rotation, clothes create silhouette",
        "Second 10: Pause—frozen moment of peak energy",
        "Second 11: Movement toward light source, deliberate approach",
        "Second 12: Final gesture as light consumes frame, triumphant",
      ];
      for (let i = 0; i < numActions; i++) {
        actions.push(explosiveActions[i]);
      }
      break;

    case "kaleidoscope":
      const kaleidoscopeActions = [
        "Second 1: Subject perfectly still—ONLY background moves",
        "Second 2: Slight head tilt that creates impossible mirror symmetry",
        "Second 3: Hand raises—but reflection does something DIFFERENT",
        "Second 4: Subject's reality fragments—appearing in multiple positions",
        "Second 5: Gravity-defying pose—floating or inverted orientation",
        "Second 6: Expression shifts through color inversions",
        "Second 7: Body geometry breaks—angles that shouldn't exist",
        "Second 8: Temporal double—subject interacts with past self",
        "Second 9: Spiral motion—subject rotates while frame spirals opposite",
        "Second 10: Glitch—subject fragments then reconstitutes",
        "Second 11: Prism effect—subject split into spectral colors",
        "Second 12: Collapse to single point, then resolution",
      ];
      for (let i = 0; i < numActions; i++) {
        actions.push(kaleidoscopeActions[i]);
      }
      break;

    case "fashion":
      const fashionActions = [
        "Second 1: Power stance—subject commands space immediately",
        "Second 2: Profile turn—SHARP 90° rotation, chin up",
        "Second 3: Look up at camera—direct eye contact, fierce",
        "Second 4: Micro-gesture—hand to neck/face, editorial classic",
        "Second 5: Hair flip or toss—deliberate, sculptural",
        "Second 6: Walk cycle—three steps of confident stride",
        "Second 7: Shoulder rotation—back view revealing form",
        "Second 8: Edge pose—diagonal lean, creates tension",
        "Second 9: Reflection acknowledgment—sees self, power doubled",
        "Second 10: Fabric interaction—grasps material, creates shape",
        "Second 11: Isolation moment—dramatic single-light pause",
        "Second 12: Walk toward camera—direct approach, won't break eye line",
      ];
      for (let i = 0; i < numActions; i++) {
        actions.push(fashionActions[i]);
      }
      break;

    case "temporal":
      const temporalActions = [
        "Second 1: Subject frozen while dawn breaks in rapid acceleration",
        "Second 2: Slow-motion gesture while shadows spin wildly",
        "Second 3: Normal walk while crowd blurs into time-lapse streaks",
        "Second 4: Deliberate movement at 1/4 speed, world at 4x speed",
        "Second 5: Subject moves FORWARD while time flows BACKWARD",
        "Second 6: Standing still while golden hour compresses to night",
        "Second 7: Watching city lights spark to life in sequence",
        "Second 8: Movement that ramps from slow to fast mid-action",
        "Second 9: Motion creates temporal echo trails—past positions visible",
        "Second 10: Moves through frozen moment—everyone else stopped",
        "Second 11: Experiences weather changes—clear/rain/fog/clear",
        "Second 12: Past/present/future versions occupy same space",
      ];
      for (let i = 0; i < numActions; i++) {
        actions.push(temporalActions[i]);
      }
      break;
  }

  return actions.join("\n");
}
