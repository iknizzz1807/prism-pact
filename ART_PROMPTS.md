# ART PROMPTS — Prism Pact (Retro Diffusion)

> Sinh tự động từ `tools/art/gen_prompts.py`. Mỗi prompt tự đứng một mình: đã gồm mô tả nhân vật,
> state animation và style block. Cứ copy nguyên khối code là dán được.

---

## 0. Cách dùng & setting chung

| Mục | Giá trị |
|---|---|
| Model | model pixel art chất lượng cao nhất đang có (RD Pro/Plus nếu có) |
| Palette | 16 màu, bám bảng màu trong `ART_BIBLE.md` |
| Outline | 1px `#14101c` |
| Background | trong suốt (trừ background scene) |
| Scale | 1:1, không upscale trong model |

**Negative dùng chung:** `blurry, anti-aliased, 3d render, photorealistic, extra limbs, deformed hands, text, letters, watermark, UI frame, drop shadow, background scenery, multiple characters`

> Với sprite sheet: thêm `inconsistent character, changing outfit, uneven spacing, cropped frame`.

**Quy ước:** sprite nhìn sang phải, chân cùng ground line, sheet ngang đúng 160px/frame. Bên địch flipX trong engine, nên chỉ cần vẽ một hướng.

> Nếu model không giữ nổi sheet: sinh từng frame (thêm `single frame, frame 2 of 4` vào prompt) rồi ghép strip trong Aseprite; portrait 96×96 downscale thành avatar 48×48.

> Ảnh rộng hơn 1024px (button 4 state, sheet 5 frame) thì sinh từng state/frame rồi ghép; đừng để model tự thu nhỏ.

---

## 1. Nhân vật (20 hero × 9 ảnh)

### Tank — `char/tank/`

**tank_portrait.png · 96×96**

```text
96x96 bust portrait of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**tank_icon32.png · 32×32**

```text
32x32 archetype icon for Tank: a battered steel tower shield with a gold prism emblem. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**tank_skill.png · 64×64**

```text
64x64 skill icon for Tank: a golden taunt shockwave pulling three enemy silhouettes toward a raised shield. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**tank_idle.png · 640×160**

```text
Full-body game sprite of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, tower shield and war hammer held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**tank_attack.png · 800×160**

```text
Full-body game sprite of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, tower shield and war hammer strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**tank_cast.png · 640×160**

```text
Full-body game sprite of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, crimson and gold glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**tank_hurt.png · 320×160**

```text
Full-body game sprite of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**tank_death.png · 640×160**

```text
Full-body game sprite of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**tank_victory.png · 480×160**

```text
Full-body game sprite of Tank, a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Burst — `char/burst/`

**burst_portrait.png · 96×96**

```text
96x96 bust portrait of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**burst_icon32.png · 32×32**

```text
32x32 archetype icon for Burst: a roaring orange flame inside a gold ring. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**burst_skill.png · 64×64**

```text
64x64 skill icon for Burst: three stacked fireballs converging into one white-hot explosion. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**burst_idle.png · 640×160**

```text
Full-body game sprite of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, twin fire orbs held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**burst_attack.png · 800×160**

```text
Full-body game sprite of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, twin fire orbs strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**burst_cast.png · 640×160**

```text
Full-body game sprite of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, orange and crimson glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**burst_hurt.png · 320×160**

```text
Full-body game sprite of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**burst_death.png · 640×160**

```text
Full-body game sprite of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**burst_victory.png · 480×160**

```text
Full-body game sprite of Burst, a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Healer — `char/healer/`

**healer_portrait.png · 96×96**

```text
96x96 bust portrait of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**healer_icon32.png · 32×32**

```text
32x32 archetype icon for Healer: a white crystal cross radiating soft light. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**healer_skill.png · 64×64**

```text
64x64 skill icon for Healer: a blooming ring of white-gold healing light around three allies. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**healer_idle.png · 640×160**

```text
Full-body game sprite of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, crystal staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**healer_attack.png · 800×160**

```text
Full-body game sprite of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, crystal staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**healer_cast.png · 640×160**

```text
Full-body game sprite of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, white and gold glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**healer_hurt.png · 320×160**

```text
Full-body game sprite of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**healer_death.png · 640×160**

```text
Full-body game sprite of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**healer_victory.png · 480×160**

```text
Full-body game sprite of Healer, a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, holding a tall crystal staff, a gentle expression, small glowing runes circling her feet. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Controller — `char/controller/`

**controller_portrait.png · 96×96**

```text
96x96 bust portrait of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**controller_icon32.png · 32×32**

```text
32x32 archetype icon for Controller: a brass gear with a glowing teal core. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**controller_skill.png · 64×64**

```text
64x64 skill icon for Controller: a spinning gear lock clamping two enemy silhouettes. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**controller_idle.png · 640×160**

```text
Full-body game sprite of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, clockwork staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**controller_attack.png · 800×160**

```text
Full-body game sprite of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, clockwork staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**controller_cast.png · 640×160**

```text
Full-body game sprite of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, teal and brass glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**controller_hurt.png · 320×160**

```text
Full-body game sprite of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**controller_death.png · 640×160**

```text
Full-body game sprite of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**controller_victory.png · 480×160**

```text
Full-body game sprite of Controller, an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, leather gloves, floating brass gears orbiting a staff topped with a clockwork head. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Buffer — `char/buffer/`

**buffer_portrait.png · 96×96**

```text
96x96 bust portrait of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**buffer_icon32.png · 32×32**

```text
32x32 archetype icon for Buffer: a blue war banner with a gold wing emblem. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**buffer_skill.png · 64×64**

```text
64x64 skill icon for Buffer: a golden rally aura lifting a blue banner above three allies. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**buffer_idle.png · 640×160**

```text
Full-body game sprite of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, war banner and horn held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**buffer_attack.png · 800×160**

```text
Full-body game sprite of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, war banner and horn strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**buffer_cast.png · 640×160**

```text
Full-body game sprite of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, blue and gold glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**buffer_hurt.png · 320×160**

```text
Full-body game sprite of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**buffer_death.png · 640×160**

```text
Full-body game sprite of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**buffer_victory.png · 480×160**

```text
Full-body game sprite of Buffer, a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, a tall war banner strapped to his back, a curved horn at his belt, heavy boots. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Debuffer — `char/debuffer/`

**debuffer_portrait.png · 96×96**

```text
96x96 bust portrait of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**debuffer_icon32.png · 32×32**

```text
32x32 archetype icon for Debuffer: a beaked plague mask over a green acid drop. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**debuffer_skill.png · 64×64**

```text
64x64 skill icon for Debuffer: green acid splashing over a cracked armor plate. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**debuffer_idle.png · 640×160**

```text
Full-body game sprite of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, acid vial and saw dagger held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**debuffer_attack.png · 800×160**

```text
Full-body game sprite of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, acid vial and saw dagger strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**debuffer_cast.png · 640×160**

```text
Full-body game sprite of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, poison green glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**debuffer_hurt.png · 320×160**

```text
Full-body game sprite of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**debuffer_death.png · 640×160**

```text
Full-body game sprite of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**debuffer_victory.png · 480×160**

```text
Full-body game sprite of Debuffer, a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, acid vials and a saw-toothed dagger on the belt, rubber gloves. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Assassin — `char/assassin/`

**assassin_portrait.png · 96×96**

```text
96x96 bust portrait of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**assassin_icon32.png · 32×32**

```text
32x32 archetype icon for Assassin: a curved dagger with a cyan trail. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**assassin_skill.png · 64×64**

```text
64x64 skill icon for Assassin: a cyan dagger arc slicing a target from behind. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**assassin_idle.png · 640×160**

```text
Full-body game sprite of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, dual curved daggers held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**assassin_attack.png · 800×160**

```text
Full-body game sprite of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, dual curved daggers strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**assassin_cast.png · 640×160**

```text
Full-body game sprite of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, violet and cyan glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**assassin_hurt.png · 320×160**

```text
Full-body game sprite of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**assassin_death.png · 640×160**

```text
Full-body game sprite of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**assassin_victory.png · 480×160**

```text
Full-body game sprite of Assassin, a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, dual curved daggers, a tattered scarf, light boots. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Bruiser — `char/bruiser/`

**bruiser_portrait.png · 96×96**

```text
96x96 bust portrait of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**bruiser_icon32.png · 32×32**

```text
32x32 archetype icon for Bruiser: a clenched fist wrapped in leather straps. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**bruiser_skill.png · 64×64**

```text
64x64 skill icon for Bruiser: a heavy punch shockwave with red impact lines. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**bruiser_idle.png · 640×160**

```text
Full-body game sprite of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, iron knuckles held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**bruiser_attack.png · 800×160**

```text
Full-body game sprite of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, iron knuckles strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**bruiser_cast.png · 640×160**

```text
Full-body game sprite of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, leather and red glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**bruiser_hurt.png · 320×160**

```text
Full-body game sprite of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**bruiser_death.png · 640×160**

```text
Full-body game sprite of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**bruiser_victory.png · 480×160**

```text
Full-body game sprite of Bruiser, a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, torn trousers, heavy boots, wrapped forearms. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Paladin — `char/paladin/`

**paladin_portrait.png · 96×96**

```text
96x96 bust portrait of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**paladin_icon32.png · 32×32**

```text
32x32 archetype icon for Paladin: a winged golden hammer with a halo. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**paladin_skill.png · 64×64**

```text
64x64 skill icon for Paladin: a dome of golden invincible light around one ally. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**paladin_idle.png · 640×160**

```text
Full-body game sprite of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, sun warhammer held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**paladin_attack.png · 800×160**

```text
Full-body game sprite of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, sun warhammer strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**paladin_cast.png · 640×160**

```text
Full-body game sprite of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, gold and white glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**paladin_hurt.png · 320×160**

```text
Full-body game sprite of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**paladin_death.png · 640×160**

```text
Full-body game sprite of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**paladin_victory.png · 480×160**

```text
Full-body game sprite of Paladin, a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, a faint golden halo behind the head, polished gold plate over white cloth. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Juggernaut — `char/juggernaut/`

**juggernaut_portrait.png · 96×96**

```text
96x96 bust portrait of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**juggernaut_icon32.png · 32×32**

```text
32x32 archetype icon for Juggernaut: a horned iron helm with crossed thorns. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**juggernaut_skill.png · 64×64**

```text
64x64 skill icon for Juggernaut: iron thorns erupting from a shield and reflecting a blow. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**juggernaut_idle.png · 640×160**

```text
Full-body game sprite of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, thorned tower shield held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**juggernaut_attack.png · 800×160**

```text
Full-body game sprite of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, thorned tower shield strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**juggernaut_cast.png · 640×160**

```text
Full-body game sprite of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, iron and red glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**juggernaut_hurt.png · 320×160**

```text
Full-body game sprite of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**juggernaut_death.png · 640×160**

```text
Full-body game sprite of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**juggernaut_victory.png · 480×160**

```text
Full-body game sprite of Juggernaut, a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, a chain skirt, a massive tower shield bristling with iron thorns. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Executioner — `char/executioner/`

**executioner_portrait.png · 96×96**

```text
96x96 bust portrait of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**executioner_icon32.png · 32×32**

```text
32x32 archetype icon for Executioner: a heavy executioner axe with a red rune. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**executioner_skill.png · 64×64**

```text
64x64 skill icon for Executioner: a vertical axe cleave splitting the ground. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**executioner_idle.png · 640×160**

```text
Full-body game sprite of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, two-handed axe held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**executioner_attack.png · 800×160**

```text
Full-body game sprite of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, two-handed axe strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**executioner_cast.png · 640×160**

```text
Full-body game sprite of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, black and red glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**executioner_hurt.png · 320×160**

```text
Full-body game sprite of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**executioner_death.png · 640×160**

```text
Full-body game sprite of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**executioner_victory.png · 480×160**

```text
Full-body game sprite of Executioner, a hooded executioner in black leather, face hidden in shadow under the hood, a giant two-handed axe with red runes, a chain belt, heavy gloves. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Sniper — `char/sniper/`

**sniper_portrait.png · 96×96**

```text
96x96 bust portrait of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**sniper_icon32.png · 32×32**

```text
32x32 archetype icon for Sniper: a rifle scope crosshair over a green leaf. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**sniper_skill.png · 64×64**

```text
64x64 skill icon for Sniper: a thin bullet trail piercing a shield. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**sniper_idle.png · 640×160**

```text
Full-body game sprite of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, long scoped rifle held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**sniper_attack.png · 800×160**

```text
Full-body game sprite of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, long scoped rifle strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**sniper_cast.png · 640×160**

```text
Full-body game sprite of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, green and brass glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**sniper_hurt.png · 320×160**

```text
Full-body game sprite of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**sniper_death.png · 640×160**

```text
Full-body game sprite of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**sniper_victory.png · 480×160**

```text
Full-body game sprite of Sniper, a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, a bandolier of bullets, fingerless gloves, quiet stance. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Cleaver — `char/cleaver/`

**cleaver_portrait.png · 96×96**

```text
96x96 bust portrait of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**cleaver_icon32.png · 32×32**

```text
32x32 archetype icon for Cleaver: a heavy cleaver with a blood notch. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**cleaver_skill.png · 64×64**

```text
64x64 skill icon for Cleaver: a wide cleaver sweep hitting three enemies at once. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**cleaver_idle.png · 640×160**

```text
Full-body game sprite of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, butcher cleaver held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**cleaver_attack.png · 800×160**

```text
Full-body game sprite of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, butcher cleaver strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**cleaver_cast.png · 640×160**

```text
Full-body game sprite of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, blood red and steel glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**cleaver_hurt.png · 320×160**

```text
Full-body game sprite of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**cleaver_death.png · 640×160**

```text
Full-body game sprite of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**cleaver_victory.png · 480×160**

```text
Full-body game sprite of Cleaver, a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, thick scarred arms, rolled sleeves. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Berserker — `char/berserker/`

**berserker_portrait.png · 96×96**

```text
96x96 bust portrait of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**berserker_icon32.png · 32×32**

```text
32x32 archetype icon for Berserker: two crossed axes over a red handprint. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**berserker_skill.png · 64×64**

```text
64x64 skill icon for Berserker: a reckless double-axe swing with red sparks. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**berserker_idle.png · 640×160**

```text
Full-body game sprite of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, twin axes held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**berserker_attack.png · 800×160**

```text
Full-body game sprite of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, twin axes strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**berserker_cast.png · 640×160**

```text
Full-body game sprite of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, red and bone glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**berserker_hurt.png · 320×160**

```text
Full-body game sprite of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**berserker_death.png · 640×160**

```text
Full-body game sprite of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**berserker_victory.png · 480×160**

```text
Full-body game sprite of Berserker, a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, a scarred muscular body, wrapped hands. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Pyromancer — `char/pyromancer/`

**pyromancer_portrait.png · 96×96**

```text
96x96 bust portrait of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**pyromancer_icon32.png · 32×32**

```text
32x32 archetype icon for Pyromancer: a brazier staff with a curling flame. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**pyromancer_skill.png · 64×64**

```text
64x64 skill icon for Pyromancer: a burning sigil igniting under a target. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**pyromancer_idle.png · 640×160**

```text
Full-body game sprite of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, brazier staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**pyromancer_attack.png · 800×160**

```text
Full-body game sprite of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, brazier staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**pyromancer_cast.png · 640×160**

```text
Full-body game sprite of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, fire orange and maroon glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**pyromancer_hurt.png · 320×160**

```text
Full-body game sprite of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**pyromancer_death.png · 640×160**

```text
Full-body game sprite of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**pyromancer_victory.png · 480×160**

```text
Full-body game sprite of Pyromancer, a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, gold bangles, a staff topped with a burning brazier, embers trailing from her hands. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Venomancer — `char/venomancer/`

**venomancer_portrait.png · 96×96**

```text
96x96 bust portrait of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**venomancer_icon32.png · 32×32**

```text
32x32 archetype icon for Venomancer: a cobra head coiled around a green vial. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**venomancer_skill.png · 64×64**

```text
64x64 skill icon for Venomancer: a toxic miasma cloud spreading over three enemies. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**venomancer_idle.png · 640×160**

```text
Full-body game sprite of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, snake-skull staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**venomancer_attack.png · 800×160**

```text
Full-body game sprite of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, snake-skull staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**venomancer_cast.png · 640×160**

```text
Full-body game sprite of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, poison green and violet glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**venomancer_hurt.png · 320×160**

```text
Full-body game sprite of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**venomancer_death.png · 640×160**

```text
Full-body game sprite of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**venomancer_victory.png · 480×160**

```text
Full-body game sprite of Venomancer, a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, poison flasks on the belt, scaled gauntlets. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Necromancer — `char/necromancer/`

**necromancer_portrait.png · 96×96**

```text
96x96 bust portrait of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**necromancer_icon32.png · 32×32**

```text
32x32 archetype icon for Necromancer: a skull with a violet flame in one eye. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**necromancer_skill.png · 64×64**

```text
64x64 skill icon for Necromancer: a violet summoning portal with a skeletal thrall rising. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**necromancer_idle.png · 640×160**

```text
Full-body game sprite of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, bone staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**necromancer_attack.png · 800×160**

```text
Full-body game sprite of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, bone staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**necromancer_cast.png · 640×160**

```text
Full-body game sprite of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, bone and violet glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**necromancer_hurt.png · 320×160**

```text
Full-body game sprite of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**necromancer_death.png · 640×160**

```text
Full-body game sprite of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**necromancer_victory.png · 480×160**

```text
Full-body game sprite of Necromancer, a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, floating bone fragments around the shoulders, a tattered hood. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Chronarch — `char/chronarch/`

**chronarch_portrait.png · 96×96**

```text
96x96 bust portrait of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**chronarch_icon32.png · 32×32**

```text
32x32 archetype icon for Chronarch: an hourglass inside a clock ring. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**chronarch_skill.png · 64×64**

```text
64x64 skill icon for Chronarch: a clock ring rewinding above an enemy team. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**chronarch_idle.png · 640×160**

```text
Full-body game sprite of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, hourglass staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**chronarch_attack.png · 800×160**

```text
Full-body game sprite of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, hourglass staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**chronarch_cast.png · 640×160**

```text
Full-body game sprite of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, blue and gold glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**chronarch_hurt.png · 320×160**

```text
Full-body game sprite of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**chronarch_death.png · 640×160**

```text
Full-body game sprite of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**chronarch_victory.png · 480×160**

```text
Full-body game sprite of Chronarch, a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, brass bracers, a long coat with star charts. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Spellbreaker — `char/spellbreaker/`

**spellbreaker_portrait.png · 96×96**

```text
96x96 bust portrait of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**spellbreaker_icon32.png · 32×32**

```text
32x32 archetype icon for Spellbreaker: a cracked rune circle with a shattered halo. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**spellbreaker_skill.png · 64×64**

```text
64x64 skill icon for Spellbreaker: a teal rune shattering a mana orb and siphoning it. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**spellbreaker_idle.png · 640×160**

```text
Full-body game sprite of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, rune blade held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**spellbreaker_attack.png · 800×160**

```text
Full-body game sprite of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, rune blade strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**spellbreaker_cast.png · 640×160**

```text
Full-body game sprite of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, teal and black glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**spellbreaker_hurt.png · 320×160**

```text
Full-body game sprite of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**spellbreaker_death.png · 640×160**

```text
Full-body game sprite of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**spellbreaker_victory.png · 480×160**

```text
Full-body game sprite of Spellbreaker, a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, gauntlets etched with anti-magic runes, a rune-etched blade. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

### Oracle — `char/oracle/`

**oracle_portrait.png · 96×96**

```text
96x96 bust portrait of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. Head and shoulders, three-quarter view facing slightly right, confident neutral expression, isolated on a transparent background, no scenery, no frame, centered with a small margin. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**oracle_icon32.png · 32×32**

```text
32x32 archetype icon for Oracle: a golden third eye with radiating lashes. Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**oracle_skill.png · 64×64**

```text
64x64 skill icon for Oracle: a soft white beam mending the lowest ally and cleansing a dark mark. Ornate gold border, dark radial background, one strong focal shape readable at 24px, centered, no text. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**oracle_idle.png · 640×160**

```text
Full-body game sprite of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. The character is shown in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance repeated four times, chest and shoulders rise 1-2 px, seer staff held steady, feet planted, cloak sways subtly. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**oracle_attack.png · 800×160**

```text
Full-body game sprite of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. The character is shown in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, seer staff strike, follow-through, recover to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 800x160, exactly 5 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**oracle_cast.png · 640×160**

```text
Full-body game sprite of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. The character is shown in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, white and gold glow building around the hands, release, settle back to stance. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**oracle_hurt.png · 320×160**

```text
Full-body game sprite of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. The character is shown in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, head snaps back, pained expression. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 320x160, exactly 2 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**oracle_death.png · 640×160**

```text
Full-body game sprite of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. The character is shown in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, collapse forward, lie still. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 640x160, exactly 4 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

**oracle_victory.png · 480×160**

```text
Full-body game sprite of Oracle, a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, a slender staff, serene posture, gold jewelry. The character is shown in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, triumphant pose. The character faces right in a three-quarter view, feet on a common ground line, centered with a small margin, isolated on a transparent background, one character per frame, identical scale and equipment in every frame, no scenery, no shadow. Sprite sheet 480x160, exactly 3 frames in one horizontal row with no gaps. 16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark.
```

---

## 2. UI

**ui_top_bar.png · 1280x48**

```text
1280x48 a long dark steel HUD bar, thin teal inner glow along the bottom edge, gold rivets at both ends, 9-slice horizontal, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_side_panel.png · 360x688**

```text
360x688 a tall vertical panel of dark slate (#111827), 1px steel border, small gold corner brackets, subtle inner vignette, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_center_panel.png · 472x688**

```text
472x688 a tall center panel of near-black blue, inset bevel, thin teal seam, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_modal.png · 460x480**

```text
460x480 a modal panel with gold corner filigree, deep slate fill, inner border, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_log_panel.png · 328x214**

```text
328x214 a dark parchment-slate log panel with a thin steel frame and a small gold header notch, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_tooltip.png · 280x120**

```text
280x120 a small dark tooltip panel with a 1px teal border and a tiny arrow notch at the bottom, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_ban_reveal.png · 860x470**

```text
860x470 a wide ban-reveal modal panel, dark slate with gold filigree corners, two columns divided by a thin gold seam, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_turn_pill.png · 440x34**

```text
440x34 a pill-shaped turn banner, dark translucent fill, teal rim, small notch at both ends, no text, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_skill_chip.png · 96x96**

```text
96x96 a square skill chip frame with a beveled gold border and a dark icon well, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_mini_slot.png · 256x62**

```text
256x62 a small horizontal hero slot, steel frame with a teal left notch for a portrait, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_card_ally.png · 328x172**

```text
328x172 a hero card frame in teal and steel, chamfered corners, inner glow, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_card_enemy.png · 328x110**

```text
328x110 a compact hero card frame in crimson and steel, angular corners, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_card_banned.png · 304x130**

```text
304x130 a cracked violet card frame with a broken seal motif, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_card_neutral.png · 304x130**

```text
304x130 a plain steel draft card frame with a thin gold inner line, empty center, 9-slice, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_button_primary.png · 1552x48**

```text
1552x48 four-state horizontal strip of a teal primary button (normal, hover, pressed, disabled), each state 388x48, beveled gold edge, no text, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_button_secondary.png · 1552x48**

```text
1552x48 four-state horizontal strip of a steel secondary button (normal, hover, pressed, disabled), each 388x48, thin blue edge, no text, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_button_gold.png · 1344x44**

```text
1344x44 four-state horizontal strip of a gold coin button (normal, hover, pressed, disabled), each 336x44, no text, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_button_ghost.png · 1344x30**

```text
1344x30 four-state horizontal strip of a transparent ghost button (normal, hover, pressed, disabled), each 336x30, thin outline only, no text, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_button_danger.png · 1344x44**

```text
1344x44 four-state horizontal strip of a crimson danger button (normal, hover, pressed, disabled), each 336x44, no text, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_bar_hp.png · 240x18**

```text
240x18 a horizontal HP bar frame with a dark inset track and a thin gold rim, empty, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_bar_mana.png · 230x12**

```text
230x12 a horizontal mana bar frame, dark inset track, thin teal rim, empty, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_bar_shield.png · 240x18**

```text
240x18 a translucent violet shield overlay for an HP bar, hexagonal notch pattern, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_bar_timer.png · 48x48**

```text
48x48 a circular countdown ring, segmented gold ticks, dark center, empty, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_input.png · 388x46**

```text
388x46 a text input field with a dark inset, 1px steel border, teal focus line at the bottom, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_tab.png · 160x36**

```text
160x36 a small tab with a chamfered top edge, steel fill, gold underline when active, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**ui_divider.png · 400x8**

```text
400x8 an ornamental divider, thin gold line with a diamond at the center, transparent background, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_timer.png · 24x24**

```text
24x24 a small hourglass icon, gold sand, dark outline, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_sound_on.png · 24x24**

```text
24x24 a small speaker icon with two sound waves, teal, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_sound_off.png · 24x24**

```text
24x24 a small speaker icon with a red slash, muted, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_settings.png · 24x24**

```text
24x24 a small gear icon, steel with a gold center, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_info.png · 24x24**

```text
24x24 a small round info badge, teal i-shape, no lettering, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_lock.png · 24x24**

```text
24x24 a small padlock icon, gold body, steel shackle, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_check.png · 24x24**

```text
24x24 a small checkmark icon, bright green, dark outline, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_cross.png · 24x24**

```text
24x24 a small x icon, crimson, dark outline, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_arrow_left.png · 24x24**

```text
24x24 a small left chevron, steel with a teal edge, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_arrow_right.png · 24x24**

```text
24x24 a small right chevron, steel with a teal edge, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_refresh.png · 24x24**

```text
24x24 a small circular refresh arrow, teal, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_wallet.png · 24x24**

```text
24x24 a small wallet icon, gold clasp, leather body, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_link.png · 24x24**

```text
24x24 a small external-link icon, teal, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_copy.png · 24x24**

```text
24x24 two overlapping small squares, steel, teal edge, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_wifi.png · 24x24**

```text
24x24 a small wifi signal icon, green, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**icon_warning.png · 24x24**

```text
24x24 a small triangular warning sign, gold with a dark exclamation mark shape, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**badge_bronze.png · 64x64**

```text
64x64 a bronze rank badge, shield shape with a single star, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**badge_silver.png · 64x64**

```text
64x64 a silver rank badge, shield shape with two stars, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**badge_gold.png · 64x64**

```text
64x64 a gold rank badge, shield shape with three stars, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**badge_diamond.png · 64x64**

```text
64x64 a diamond rank badge, faceted crystal shield with four points, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**badge_prism.png · 64x64**

```text
64x64 a prism rank badge, rainbow-faceted crystal shield with a prism core, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**coin_gold.png · 32x32**

```text
32x32 a gold coin with a prism emblem, dark rim, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**coin_usdc.png · 32x32**

```text
32x32 a blue USDC token with a white ring and dollar notch, dark rim, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**logo_mark.png · 256x256**

```text
256x256 the Prism Pact logo mark: three overlapping diamond prisms, teal violet and gold, on a transparent background, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**logo_wordmark.png · 512x128**

```text
512x128 the words PRISM PACT in chunky pixel lettering, teal gradient with gold rim, transparent background, readable, isolated on a transparent background, centered. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

---

## 3. Gem & status

### 3.1 Gem (48×48)

**gem_atk.png · 48x48**

```text
48x48 a faceted crimson attack gem shaped like a sharp droplet, a small sword glyph in the core, bright rim light, thick dark outline, bright rim light, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**gem_hp.png · 48x48**

```text
48x48 a faceted green health gem shaped like a rounded leaf, a small cross glyph in the core, thick dark outline, bright rim light, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**gem_mana.png · 48x48**

```text
48x48 a faceted blue mana gem shaped like a tall droplet, a small wave glyph in the core, thick dark outline, bright rim light, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**gem_shield.png · 48x48**

```text
48x48 a faceted violet shield gem shaped like a diamond, a small shield glyph in the core, thick dark outline, bright rim light, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**gem_bomb.png · 48x48**

```text
48x48 a dark red bomb gem, round with a lit fuse and a skull notch, cracked surface, thick dark outline, bright rim light, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**gem_rainbow.png · 48x48**

```text
48x48 a white prism gem splitting light into a rainbow, hexagonal cut, bright core, thick dark outline, bright rim light, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

### 3.2 Status icon (24×24)

**st_burn.png · 24×24**

```text
24x24 status icon: a small flame badge, orange core, dark outline, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_poison.png · 24×24**

```text
24x24 status icon: a small bubbling poison droplet badge, green core, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_shield.png · 24×24**

```text
24x24 status icon: a small hexagonal shield badge, violet, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_taunt.png · 24×24**

```text
24x24 status icon: a small shouting mouth badge, red, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_invincible.png · 24×24**

```text
24x24 status icon: a small golden halo badge with a bright center, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_thorns.png · 24×24**

```text
24x24 status icon: a small spiked ring badge, iron with red tips, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_def_up.png · 24×24**

```text
24x24 status icon: a small upward chevron over a shield badge, blue, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_weaken.png · 24×24**

```text
24x24 status icon: a small cracked downward arrow badge, purple, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_skill_tax.png · 24×24**

```text
24x24 status icon: a small padlock over a mana drop badge, teal, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

**st_summon.png · 24×24**

```text
24x24 status icon: a small skull portal badge, violet and bone, thick dark outline, readable at 1x, centered, transparent background. pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark.
```

---

## 4. Background & khung cảnh

**bg_lobby.png · 640x360**

```text
640x360 a grand prism hall lobby: three tall stained-glass columns, a polished obsidian floor with teal reflections, gold filigree arches, empty center for UI, no characters. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

**bg_draft.png · 640x360**

```text
640x360 a war room with a huge round strategy table, floating holographic map, banners of teal and crimson, candlelight, empty center. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

**bg_arena_colosseum.png · 640x360**

```text
640x360 a stone colosseum arena at dusk, two raised side platforms, torches, sand floor with a circular dais at the center, distant crowd silhouettes, no characters. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

**bg_arena_temple.png · 640x360**

```text
640x360 a crystal temple arena, floating prism shards, teal and violet light beams, polished floor with a circular dais, no characters. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

**bg_arena_frost.png · 640x360**

```text
640x360 a frozen arena, ice pillars, blue mist, cracked frozen floor with a circular dais, no characters. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

**bg_result_victory.png · 640x360**

```text
640x360 a radiant victory backdrop: golden light rays from the top, floating dust, dark vignette edges, no characters. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

**bg_boot.png · 640x360**

```text
640x360 a dark boot splash: deep space gradient with faint prism constellation lines, a soft teal glow at the center, no text. Wide 16:9 composition with a clear empty center for gameplay. 16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark.
```

---

## 5. Hiệu ứng

**fx_slash.png · 96x96 · 5 frame**

```text
96x96 effect sprite sheet: a crescent sword slash arc, white core with cyan edge, motion streaks. Exactly 5 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_impact.png · 64x64 · 4 frame**

```text
64x64 effect sprite sheet: a radial hit burst, white core, orange sparks, expanding ring. Exactly 4 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_fire.png · 96x96 · 6 frame**

```text
96x96 effect sprite sheet: a fire explosion, yellow core, orange tongues, red smoke. Exactly 6 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_poison.png · 96x96 · 6 frame**

```text
96x96 effect sprite sheet: a bubbling poison cloud, green core, purple haze. Exactly 6 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_heal.png · 64x64 · 5 frame**

```text
64x64 effect sprite sheet: soft healing sparkles rising, white-gold motes. Exactly 5 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_shield.png · 64x64 · 4 frame**

```text
64x64 effect sprite sheet: a hexagonal shield flash, violet facets, bright rim. Exactly 4 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_lightning.png · 64x64 · 4 frame**

```text
64x64 effect sprite sheet: a jagged lightning bolt, white core, cyan glow. Exactly 4 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_bomb.png · 96x96 · 6 frame**

```text
96x96 effect sprite sheet: a bomb explosion, white flash, orange fireball, dark smoke ring. Exactly 6 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_rainbow.png · 128x128 · 6 frame**

```text
128x128 effect sprite sheet: a rainbow prism sweep, seven-color band, white core. Exactly 6 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_crit.png · 64x64 · 3 frame**

```text
64x64 effect sprite sheet: a critical hit flash, four-point star, gold and white. Exactly 3 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_death.png · 96x96 · 5 frame**

```text
96x96 effect sprite sheet: a death dissolve, dark purple particles collapsing inward. Exactly 5 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_summon.png · 96x96 · 5 frame**

```text
96x96 effect sprite sheet: a violet summoning glyph, rune circle, rising bone particles. Exactly 5 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_buff.png · 64x64 · 4 frame**

```text
64x64 effect sprite sheet: a golden buff aura rising, upward chevrons. Exactly 4 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_debuff.png · 64x64 · 4 frame**

```text
64x64 effect sprite sheet: a dark debuff smoke, purple downward wisps. Exactly 4 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_turn_flash.png · 640x64 · 3 frame**

```text
640x64 effect sprite sheet: a horizontal turn-change flash, teal to transparent gradient. Exactly 3 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_victory_rays.png · 256x256 · 8 frame**

```text
256x256 effect sprite sheet: rotating golden victory rays, soft glow, transparent center. Exactly 8 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

**fx_defeat_vignette.png · 640x360 · 1 frame**

```text
640x360 effect sprite sheet: a dark defeat vignette, crimson edges fading to black, transparent center. Exactly 1 frames in one horizontal row, evenly spaced, transparent background, bright additive core. 16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, clean hard pixels, no anti-aliasing, no text, on a transparent background.
```

---

## 6. Kiểm tra sau khi sinh

1. Đúng size, nền trong suốt, không dính viền trắng.
2. Sprite sheet đủ frame, không lệch ground line.
3. Quantize về palette chung; `lint_sprite` sạch pixel lạc.
4. Nhìn 1x: nhận ra tướng trong 0.5 giây.
5. Cùng tướng: portrait / icon / sprite phải khớp màu và trang bị.
