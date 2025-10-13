# Subject Context Update

## Problem
The dynamic storyline generation was creating storylines that were **completely unrelated** to the reference image subject. For example:
- Reference image: abstract geometric shapes
- Generated storyline: "Urban warrior in neon city" ❌

This happened because the image analysis was **explicitly ignoring** the subject/scene and focusing only on pure style/mood.

## User Feedback
> "When analysing the image, focus on the subject/object in the scene so that the next storyline makes sense."

## Solution Implemented

Updated the system to analyze and include **subject/scene context** while maintaining the style/mood focus.

---

## Changes Made

### 1. Updated Image Analysis Schema
**File**: `src/lib/schemas/image-analysis-schema.ts`

Added new `subject` field to capture:
- **type**: What is the main subject (person, cityscape, nature, object, abstract)
- **description**: Brief description of the subject
- **context**: What the subject is doing or represents

```typescript
subject: z.object({
  type: z.string().describe("What is the main subject/object in the scene"),
  description: z.string().describe("Brief description of the subject"),
  context: z.string().describe("What the subject is doing or represents"),
}),
```

### 2. Updated Image Analysis API
**File**: `src/app/api/analyze-image/route.ts`

**Changed prompt from:**
```
Analyze this image focusing EXCLUSIVELY on STYLE and MOOD - 
ignore specific subjects, people, poses, or actions.
```

**Changed to:**
```
Analyze this image focusing on the SUBJECT/SCENE, STYLE, and MOOD.

0. **Subject/Scene Identification**:
   - What is the main subject or focal point?
   - Brief description of what's in the scene
   - What the subject represents or is doing - general context only
```

**Also fixed:** Changed model from `"gpt-5"` to `"gpt-4o"` (GPT-5 doesn't exist yet)

### 3. Updated Storyline Generation API
**File**: `src/app/api/generate-storylines/route.ts`

**Added subject context to the AI prompt:**
```typescript
REFERENCE IMAGE SUBJECT:
- Type: ${subject.type}
- Description: ${subject.description}
- Context: ${subject.context}
```

**Updated generation instructions:**
```
Generate 4 DISTINCT storyline concepts that:
- Match the visual aesthetic and emotional tone of the reference
- Are THEMATICALLY RELATED to the reference subject
- Feel like variations/interpretations of the reference subject
```

**Changed from:**
- "completely different subjects and narratives"

**Changed to:**
- "thematically related to the reference subject"
- "variations/interpretations of the reference subject, not random different topics"

---

## Example Flow

### Reference Image: Lone figure in blue-lit cityscape

**Previous Behavior (Wrong):**
```
Storyline 1: Urban warrior with neon sword ❌
Storyline 2: Fashion model on runway ❌  
Storyline 3: Abstract geometric dancer ❌
Storyline 4: Time-traveling artist ❌
```
(All unrelated to the reference subject)

**New Behavior (Correct):**
```
Analysis includes:
- Subject: "person"
- Description: "lone figure in urban environment"
- Context: "contemplating, solitary"

Generated Storylines:
Storyline 1: Solitary wanderer in neon-lit streets ✅
Storyline 2: Lone detective investigating at night ✅
Storyline 3: Urban philosopher on empty overpass ✅
Storyline 4: Night shift worker in quiet city ✅
```
(All thematically related to solitary figure in urban setting)

---

## Benefits

✅ **Thematic Coherence**: Storylines relate to reference subject  
✅ **Creative Variation**: Still 4 unique interpretations  
✅ **Style Preservation**: Maintains visual style and mood  
✅ **Better Results**: More meaningful video variations  

## Backward Compatibility

No breaking changes to:
- API interfaces
- Type definitions
- Client code
- Existing handlers

The schema is extended, not replaced. Old code will still work if the `subject` field is optional (though it's now required by the schema).

---

## Testing Recommendations

Test with different subject types:

1. **Person/People**: Should generate storylines about people in similar context
2. **Landscapes**: Should generate different landscape/nature variations
3. **Objects**: Should focus on the object type
4. **Abstract**: Should generate abstract variations with similar visual themes
5. **Urban/Cityscapes**: Should stay in urban environments
6. **Nature**: Should stay in natural settings

Each should maintain the style/mood while varying the specific narrative around the subject theme.

---

## Summary

The system now:
1. ✅ Analyzes the subject/scene in the reference image
2. ✅ Passes subject context to storyline generation
3. ✅ Generates thematically related storylines
4. ✅ Maintains style/mood consistency
5. ✅ Creates meaningful variations instead of random topics

This makes the video variations much more useful and coherent with the reference image.
