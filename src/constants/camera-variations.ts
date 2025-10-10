/**
 * Camera setting variation prompts for image generation
 * These prompts will be used to generate 8 different variations of an image
 * with different camera angles and composition styles
 */
export const CAMERA_VARIATIONS = [
  "DUTCH TILT (CANTED) 15° — CONTROLLED HORIZON ROLL for tension; anchor verticals to avoid drift.",
  "EXTREME CLOSE‑UP (ECU) EYES — iris and eyelash detail; stabilized framing prioritizes MICRO‑EXPRESSION over context.",
  "EXTREME CLOSE‑UP (ECU) HANDS — TACTILE CONTACT AND GESTURE; skin texture and pressure cues read clearly.",
  "EXTREME LOW‑ANGLE HERO — CAMERA JUST ABOVE GROUND, TILTED UP; architecture looms while SILHOUETTE STAYS READABLE.",
  "INTIMATE CLOSE-UP FRAMING — SUBJECT FILLS FRAME with minimal negative space; emphasizes details and textures with shallow depth of field.",
  "OVER‑THE‑SHOULDER TIGHT CLOSE‑UP — OTS frameline near edge; PROXIMITY AND INTIMACY dominate the moment.",
  "POV CLOSE‑CLOSE — HANDS INTERACTING with an object at arm's length; shallow depth with DELIBERATE BREATHING MOTION.",
  "PROFILE EXTREME CLOSE‑UP — NOSE‑LIP‑CHIN CONTOUR in relief; single kicker light sculpts the edge.",
  "TILT‑UP REVEAL FROM GROUND — start on textured foreground, CLIMB TO FACE; rising energy without lens distortion.",
] as const;
