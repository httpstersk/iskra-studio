# Prompt Optimization for Sora API

## Problem

Initial implementation generated extremely detailed prompts (3000-5000+ characters) that included:
- Full image analysis text embedded verbatim
- Detailed shot-by-shot breakdowns with 12+ shots listed
- Extensive action lists
- Multiple sections (style, cinematography, actions, sound, camera notes)

This caused **"Unprocessable Entity" errors** from the Sora API due to exceeding prompt length limits.

## Solution

Optimized prompts to **~900-1000 characters** while maintaining:
- ✅ High-intensity creative vision
- ✅ 1 cut per second structure
- ✅ All 4 distinct visual styles
- ✅ Clear cinematographic direction
- ✅ Specific subject actions
- ✅ Technical specifications

## Optimization Techniques

### 1. **Visual Summary Instead of Full Analysis**
```typescript
// BEFORE: Embedded 2000+ char analysis
Reference Image Analysis:
${analysis}  // Full detailed analysis

// AFTER: Extract 150-char summary
Image: ${extractVisualSummary(analysis)}  // Brief essence
```

### 2. **Compressed Shot Lists**
```typescript
// BEFORE: Detailed list with timing
0.00–1.00 — Shot 1: "PUNCH IN" (extreme close-up, instant zoom)
VIOLENT zoom into subject's most striking feature. Strobe flash...
[repeated for all shots]

// AFTER: Comma-separated flow
Each second = NEW DRAMATIC ANGLE:
Violent zoom-ins → orbital spins → macro details → overhead plunges...
```

### 3. **Condensed Actions**
```typescript
// BEFORE: Line by line with full descriptions
Second 1: Subject snaps to attention, eyes LOCK on camera
Second 2: Head whips 90°, hair follows with delay, creates motion trail
[repeated for duration]

// AFTER: Compact arrows
Subject actions: Snap attention → head whip → sharp gestures → body rotation...
```

### 4. **Removed Redundancy**
- Eliminated separate "Camera Notes" section
- Combined lighting and mood into cinematography flow
- Shortened technical specifications

## Results

| Style | Old Length | New Length | Reduction |
|-------|-----------|-----------|-----------|
| Explosive Energy | ~3500 chars | ~980 chars | 72% |
| Kaleidoscope Reality | ~3200 chars | ~920 chars | 71% |
| Fashion Storm | ~3400 chars | ~950 chars | 72% |
| Time Collapse | ~3300 chars | ~940 chars | 71% |

## Key Retained Elements

Despite 70%+ size reduction, prompts still include:

✅ **Visual Style** - Clear aesthetic direction (EXPLOSIVE, KALEIDOSCOPE, etc.)  
✅ **Technical Specs** - Frame rates, lenses, lighting setup  
✅ **1 Cut Per Second** - Explicit duration-based cuts  
✅ **Shot Variety** - 12 distinct shot types compressed into flow  
✅ **Subject Context** - Brief image analysis summary  
✅ **Actions** - Clear subject movements per second  
✅ **Mood & Atmosphere** - Emotional and visual tone  
✅ **Creative Intent** - Bold vision (chaos, impossibility, power, time)  

## Example: Explosive Energy (979 chars)

```
EXPLOSIVE commercial cinematography. 120fps. 4 RAPID 1-SECOND CUTS. Anamorphic flares, motion blur streaks, hyper-saturated colors, crushed blacks, blown highlights.

Image: A young woman in her mid-20s wearing a flowing red silk dress stands on a brick rooftop at golden hour. Her dark curly hair catches the warm sunset li...

Each second = NEW DRAMATIC ANGLE:
Violent zoom-ins → orbital camera spins → extreme macro details → overhead plunges → whip pans to profile → low-angle power shots → mirror reflections → wide pullback reveals → dutch tilt rotations → slow-mo explosions → tracking parallels → final lens flare.

Camera WHIPS between: extreme close-ups, wide reveals, macro textures. Strobing key light, cyan/magenta gels, practical bursts.

Subject actions: Snap attention → head whip → sharp gestures → body rotation → fabric flare → power step → intense expression → geometric poses.

CONTROLLED CHAOS. Subject sharp, environment explodes. Every cut = VISUAL PUNCH.
```

## Benefits

1. **API Compatibility** - Prompts now accepted by Sora API
2. **Maintained Creativity** - Still high-intensity and specific
3. **Clear Direction** - Cinematographers would understand intent
4. **Efficient** - Removes verbosity while keeping essence
5. **Scalable** - Works for 4s, 8s, and 12s durations

## Future Improvements

- **A/B test** prompt lengths to find optimal balance
- **User feedback** on generated video quality
- **Dynamic compression** based on analysis length
- **Style-specific optimization** (some styles may benefit from longer prompts)
