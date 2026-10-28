"""Sinh ART_PROMPTS.md — danh sách prompt độc lập cho Retro Diffusion.

Mỗi prompt tự chứa đủ mô tả nhân vật + style block, vì ảnh sinh rời rạc.
Chạy: python tools/art/gen_prompts.py
"""

from __future__ import annotations

import os

STYLE = (
    "16-bit pixel art, premium mobile RPG battle sprite in the style of Summoners War, "
    "crisp 1px dark plum outline (#14101c), limited 16-color palette, soft light from the top-left, "
    "flat cel shading, hard pixel edges, no anti-aliasing, no dithering, no text, no watermark."
)

STYLE_UI = (
    "pixel art game UI asset, 16-bit, crisp hard edges, 1px dark plum outline (#14101c), "
    "limited palette, subtle top-left highlight, flat shading, no text, no letters, no watermark."
)

STYLE_BG = (
    "16-bit pixel art background, side-scrolling RPG arena, painted in broad readable shapes, "
    "limited palette, soft top-left light, atmospheric depth, no characters, no UI, no text, no watermark."
)

STYLE_FX = (
    "16-bit pixel art effect sprite sheet, bright saturated core, dark plum outline, "
    "clean hard pixels, no anti-aliasing, no text, on a transparent background."
)

HEROES = [
    dict(
        id="tank", name="Tank", role="vanguard",
        desc=("a broad-shouldered veteran knight in scarred steel plate armor (#6c7995 with #414863 shadows), "
              "a crimson tabard (#8c2f3f), a bald head with a scar over the left brow and a square jaw, "
              "a massive tower shield bearing a gold prism emblem on the left arm, a short war hammer at the belt"),
        weapon="tower shield and war hammer",
        symbol="a battered steel tower shield with a gold prism emblem",
        skill="a golden taunt shockwave pulling three enemy silhouettes toward a raised shield",
        accent="crimson and gold",
    ),
    dict(
        id="burst", name="Burst", role="mage",
        desc=("a young female fire mage with spiky orange hair and ember eyes, a crimson robe with gold trim "
              "and a high collar, fingerless gloves, twin floating fire orbs at her sides, no armor"),
        weapon="twin fire orbs",
        symbol="a roaring orange flame inside a gold ring",
        skill="three stacked fireballs converging into one white-hot explosion",
        accent="orange and crimson",
    ),
    dict(
        id="healer", name="Healer", role="support",
        desc=("a young priestess with long white hair, a gold circlet, white and gold vestments with a teal sash, "
              "holding a tall crystal staff, a gentle expression, small glowing runes circling her feet"),
        weapon="crystal staff",
        symbol="a white crystal cross radiating soft light",
        skill="a blooming ring of white-gold healing light around three allies",
        accent="white and gold",
    ),
    dict(
        id="controller", name="Controller", role="control",
        desc=("an androgynous clockwork mage in a teal hooded coat, a brass monocle and a gear-shaped pauldron, "
              "leather gloves, floating brass gears orbiting a staff topped with a clockwork head"),
        weapon="clockwork staff",
        symbol="a brass gear with a glowing teal core",
        skill="a spinning gear lock clamping two enemy silhouettes",
        accent="teal and brass",
    ),
    dict(
        id="buffer", name="Buffer", role="support",
        desc=("a broad male standard-bearer in blue and gold half-plate, a winged helm with a blue plume, "
              "a tall war banner strapped to his back, a curved horn at his belt, heavy boots"),
        weapon="war banner and horn",
        symbol="a blue war banner with a gold wing emblem",
        skill="a golden rally aura lifting a blue banner above three allies",
        accent="blue and gold",
    ),
    dict(
        id="debuffer", name="Debuffer", role="debuff",
        desc=("a plague doctor in a dark green waxed coat, a beaked mask with round glass lenses, a wide-brim hat, "
              "acid vials and a saw-toothed dagger on the belt, rubber gloves"),
        weapon="acid vial and saw dagger",
        symbol="a beaked plague mask over a green acid drop",
        skill="green acid splashing over a cracked armor plate",
        accent="poison green",
    ),
    dict(
        id="assassin", name="Assassin", role="assassin",
        desc=("a slim hooded assassin in purple-black leather, a lower-face mask, glowing cyan eyes, "
              "dual curved daggers, a tattered scarf, light boots"),
        weapon="dual curved daggers",
        symbol="a curved dagger with a cyan trail",
        skill="a cyan dagger arc slicing a target from behind",
        accent="violet and cyan",
    ),
    dict(
        id="bruiser", name="Bruiser", role="bruiser",
        desc=("a bare-knuckle brawler with a black mohawk, a scarred bare chest, leather straps and iron knuckles, "
              "torn trousers, heavy boots, wrapped forearms"),
        weapon="iron knuckles",
        symbol="a clenched fist wrapped in leather straps",
        skill="a heavy punch shockwave with red impact lines",
        accent="leather and red",
    ),
    dict(
        id="paladin", name="Paladin", role="tank",
        desc=("a golden-armored paladin with a winged helm, a white cape, a warhammer with a sun emblem, "
              "a faint golden halo behind the head, polished gold plate over white cloth"),
        weapon="sun warhammer",
        symbol="a winged golden hammer with a halo",
        skill="a dome of golden invincible light around one ally",
        accent="gold and white",
    ),
    dict(
        id="juggernaut", name="Juggernaut", role="tank",
        desc=("a colossal armored juggernaut in blackened iron plate, a horned great helm, spiked gauntlets, "
              "a chain skirt, a massive tower shield bristling with iron thorns"),
        weapon="thorned tower shield",
        symbol="a horned iron helm with crossed thorns",
        skill="iron thorns erupting from a shield and reflecting a blow",
        accent="iron and red",
    ),
    dict(
        id="executioner", name="Executioner", role="assassin",
        desc=("a hooded executioner in black leather, face hidden in shadow under the hood, "
              "a giant two-handed axe with red runes, a chain belt, heavy gloves"),
        weapon="two-handed axe",
        symbol="a heavy executioner axe with a red rune",
        skill="a vertical axe cleave splitting the ground",
        accent="black and red",
    ),
    dict(
        id="sniper", name="Sniper", role="assassin",
        desc=("a female sharpshooter in a green hooded cloak, brass goggles, a long rifle with a scope, "
              "a bandolier of bullets, fingerless gloves, quiet stance"),
        weapon="long scoped rifle",
        symbol="a rifle scope crosshair over a green leaf",
        skill="a thin bullet trail piercing a shield",
        accent="green and brass",
    ),
    dict(
        id="cleaver", name="Cleaver", role="bruiser",
        desc=("a bald butcher with a blood-stained apron over a bare chest, a huge cleaver, a meat hook on the belt, "
              "thick scarred arms, rolled sleeves"),
        weapon="butcher cleaver",
        symbol="a heavy cleaver with a blood notch",
        skill="a wide cleaver sweep hitting three enemies at once",
        accent="blood red and steel",
    ),
    dict(
        id="berserker", name="Berserker", role="bruiser",
        desc=("a shirtless wild warrior with red war paint, wild dark hair, a fur belt, twin axes, "
              "a scarred muscular body, wrapped hands"),
        weapon="twin axes",
        symbol="two crossed axes over a red handprint",
        skill="a reckless double-axe swing with red sparks",
        accent="red and bone",
    ),
    dict(
        id="pyromancer", name="Pyromancer", role="mage",
        desc=("a fire dancer with ember-orange hair, maroon and gold robes with flame patterns, "
              "gold bangles, a staff topped with a burning brazier, embers trailing from her hands"),
        weapon="brazier staff",
        symbol="a brazier staff with a curling flame",
        skill="a burning sigil igniting under a target",
        accent="fire orange and maroon",
    ),
    dict(
        id="venomancer", name="Venomancer", role="mage",
        desc=("a serpent-cult mage in green and purple robes, a cobra hood collar, a staff crowned with a snake skull, "
              "poison flasks on the belt, scaled gauntlets"),
        weapon="snake-skull staff",
        symbol="a cobra head coiled around a green vial",
        skill="a toxic miasma cloud spreading over three enemies",
        accent="poison green and violet",
    ),
    dict(
        id="necromancer", name="Necromancer", role="summoner",
        desc=("a bone-armored necromancer in violet and green robes, a skull mask, a staff with a bone orb, "
              "floating bone fragments around the shoulders, a tattered hood"),
        weapon="bone staff",
        symbol="a skull with a violet flame in one eye",
        skill="a violet summoning portal with a skeletal thrall rising",
        accent="bone and violet",
    ),
    dict(
        id="chronarch", name="Chronarch", role="controller",
        desc=("a hooded chronomancer in blue and gold robes, an hourglass staff, floating clock rings around the arms, "
              "brass bracers, a long coat with star charts"),
        weapon="hourglass staff",
        symbol="an hourglass inside a clock ring",
        skill="a clock ring rewinding above an enemy team",
        accent="blue and gold",
    ),
    dict(
        id="spellbreaker", name="Spellbreaker", role="controller",
        desc=("a rune-scarred warrior in teal and black plate, a broken golden halo floating behind the head, "
              "gauntlets etched with anti-magic runes, a rune-etched blade"),
        weapon="rune blade",
        symbol="a cracked rune circle with a shattered halo",
        skill="a teal rune shattering a mana orb and siphoning it",
        accent="teal and black",
    ),
    dict(
        id="oracle", name="Oracle", role="healer",
        desc=("a blindfolded seer in white and gold robes, a gold blindfold over the eyes, a floating third eye above the brow, "
              "a slender staff, serene posture, gold jewelry"),
        weapon="seer staff",
        symbol="a golden third eye with radiating lashes",
        skill="a soft white beam mending the lowest ally and cleansing a dark mark",
        accent="white and gold",
    ),
]

STATES = {
    "idle": dict(
        frames=4,
        clause=("in a 4-frame idle breathing loop laid out as one horizontal sprite sheet: the same relaxed combat stance "
                "repeated four times, chest and shoulders rise 1-2 px, {weapon} held steady, feet planted, cloak sways subtly"),
        loop=True,
    ),
    "attack": dict(
        frames=5,
        clause=("in a 5-frame attack animation laid out as one horizontal sprite sheet: anticipation crouch, wind-up, "
                "{weapon} strike, follow-through, recover to stance"),
        loop=False,
    ),
    "cast": dict(
        frames=4,
        clause=("in a 4-frame skill-cast animation laid out as one horizontal sprite sheet: gathering energy, "
                "{accent} glow building around the hands, release, settle back to stance"),
        loop=False,
    ),
    "hurt": dict(
        frames=2,
        clause=("in a 2-frame hurt reaction laid out as one horizontal sprite sheet: torso recoils backward, "
                "head snaps back, pained expression"),
        loop=False,
    ),
    "death": dict(
        frames=4,
        clause=("in a 4-frame death animation laid out as one horizontal sprite sheet: stagger, drop to one knee, "
                "collapse forward, lie still"),
        loop=False,
    ),
    "victory": dict(
        frames=3,
        clause=("in a 3-frame victory animation laid out as one horizontal sprite sheet: weapon raised, chest out, "
                "triumphant pose"),
        loop=True,
    ),
}

UI = [
    ("ui_top_bar", "1280x48", "a long dark steel HUD bar, thin teal inner glow along the bottom edge, gold rivets at both ends, 9-slice horizontal"),
    ("ui_side_panel", "360x688", "a tall vertical panel of dark slate (#111827), 1px steel border, small gold corner brackets, subtle inner vignette, 9-slice"),
    ("ui_center_panel", "472x688", "a tall center panel of near-black blue, inset bevel, thin teal seam, 9-slice"),
    ("ui_modal", "460x480", "a modal panel with gold corner filigree, deep slate fill, inner border, 9-slice"),
    ("ui_log_panel", "328x214", "a dark parchment-slate log panel with a thin steel frame and a small gold header notch, 9-slice"),
    ("ui_tooltip", "280x120", "a small dark tooltip panel with a 1px teal border and a tiny arrow notch at the bottom, 9-slice"),
    ("ui_ban_reveal", "860x470", "a wide ban-reveal modal panel, dark slate with gold filigree corners, two columns divided by a thin gold seam, empty center, 9-slice"),
    ("ui_turn_pill", "440x34", "a pill-shaped turn banner, dark translucent fill, teal rim, small notch at both ends, no text"),
    ("ui_skill_chip", "96x96", "a square skill chip frame with a beveled gold border and a dark icon well, empty center, 9-slice"),
    ("ui_mini_slot", "256x62", "a small horizontal hero slot, steel frame with a teal left notch for a portrait, empty center, 9-slice"),
    ("ui_card_ally", "328x172", "a hero card frame in teal and steel, chamfered corners, inner glow, empty center, 9-slice"),
    ("ui_card_enemy", "328x110", "a compact hero card frame in crimson and steel, angular corners, empty center, 9-slice"),
    ("ui_card_banned", "304x130", "a cracked violet card frame with a broken seal motif, empty center, 9-slice"),
    ("ui_card_neutral", "304x130", "a plain steel draft card frame with a thin gold inner line, empty center, 9-slice"),
    ("ui_button_primary", "1552x48", "four-state horizontal strip of a teal primary button (normal, hover, pressed, disabled), each state 388x48, beveled gold edge, no text"),
    ("ui_button_secondary", "1552x48", "four-state horizontal strip of a steel secondary button (normal, hover, pressed, disabled), each 388x48, thin blue edge, no text"),
    ("ui_button_gold", "1344x44", "four-state horizontal strip of a gold coin button (normal, hover, pressed, disabled), each 336x44, no text"),
    ("ui_button_ghost", "1344x30", "four-state horizontal strip of a transparent ghost button (normal, hover, pressed, disabled), each 336x30, thin outline only, no text"),
    ("ui_button_danger", "1344x44", "four-state horizontal strip of a crimson danger button (normal, hover, pressed, disabled), each 336x44, no text"),
    ("ui_bar_hp", "240x18", "a horizontal HP bar frame with a dark inset track and a thin gold rim, empty"),
    ("ui_bar_mana", "230x12", "a horizontal mana bar frame, dark inset track, thin teal rim, empty"),
    ("ui_bar_shield", "240x18", "a translucent violet shield overlay for an HP bar, hexagonal notch pattern"),
    ("ui_bar_timer", "48x48", "a circular countdown ring, segmented gold ticks, dark center, empty"),
    ("ui_input", "388x46", "a text input field with a dark inset, 1px steel border, teal focus line at the bottom"),
    ("ui_tab", "160x36", "a small tab with a chamfered top edge, steel fill, gold underline when active"),
    ("ui_divider", "400x8", "an ornamental divider, thin gold line with a diamond at the center, transparent background"),
    ("icon_timer", "24x24", "a small hourglass icon, gold sand, dark outline"),
    ("icon_sound_on", "24x24", "a small speaker icon with two sound waves, teal"),
    ("icon_sound_off", "24x24", "a small speaker icon with a red slash, muted"),
    ("icon_settings", "24x24", "a small gear icon, steel with a gold center"),
    ("icon_info", "24x24", "a small round info badge, teal i-shape, no lettering"),
    ("icon_lock", "24x24", "a small padlock icon, gold body, steel shackle"),
    ("icon_check", "24x24", "a small checkmark icon, bright green, dark outline"),
    ("icon_cross", "24x24", "a small x icon, crimson, dark outline"),
    ("icon_arrow_left", "24x24", "a small left chevron, steel with a teal edge"),
    ("icon_arrow_right", "24x24", "a small right chevron, steel with a teal edge"),
    ("icon_refresh", "24x24", "a small circular refresh arrow, teal"),
    ("icon_wallet", "24x24", "a small wallet icon, gold clasp, leather body"),
    ("icon_link", "24x24", "a small external-link icon, teal"),
    ("icon_copy", "24x24", "two overlapping small squares, steel, teal edge"),
    ("icon_wifi", "24x24", "a small wifi signal icon, green"),
    ("icon_warning", "24x24", "a small triangular warning sign, gold with a dark exclamation mark shape"),
    ("badge_bronze", "64x64", "a bronze rank badge, shield shape with a single star"),
    ("badge_silver", "64x64", "a silver rank badge, shield shape with two stars"),
    ("badge_gold", "64x64", "a gold rank badge, shield shape with three stars"),
    ("badge_diamond", "64x64", "a diamond rank badge, faceted crystal shield with four points"),
    ("badge_prism", "64x64", "a prism rank badge, rainbow-faceted crystal shield with a prism core"),
    ("coin_gold", "32x32", "a gold coin with a prism emblem, dark rim"),
    ("coin_usdc", "32x32", "a blue USDC token with a white ring and dollar notch, dark rim"),
    ("logo_mark", "256x256", "the Prism Pact logo mark: three overlapping diamond prisms, teal violet and gold, on a transparent background"),
    ("logo_wordmark", "512x128", "the words PRISM PACT in chunky pixel lettering, teal gradient with gold rim, transparent background, readable"),
]

GEMS = [
    ("gem_atk", "48x48", "a faceted crimson attack gem shaped like a sharp droplet, a small sword glyph in the core, bright rim light"),
    ("gem_hp", "48x48", "a faceted green health gem shaped like a rounded leaf, a small cross glyph in the core"),
    ("gem_mana", "48x48", "a faceted blue mana gem shaped like a tall droplet, a small wave glyph in the core"),
    ("gem_shield", "48x48", "a faceted violet shield gem shaped like a diamond, a small shield glyph in the core"),
    ("gem_bomb", "48x48", "a dark red bomb gem, round with a lit fuse and a skull notch, cracked surface"),
    ("gem_rainbow", "48x48", "a white prism gem splitting light into a rainbow, hexagonal cut, bright core"),
]

STATUS = [
    ("st_burn", "a small flame badge, orange core, dark outline"),
    ("st_poison", "a small bubbling poison droplet badge, green core"),
    ("st_shield", "a small hexagonal shield badge, violet"),
    ("st_taunt", "a small shouting mouth badge, red"),
    ("st_invincible", "a small golden halo badge with a bright center"),
    ("st_thorns", "a small spiked ring badge, iron with red tips"),
    ("st_def_up", "a small upward chevron over a shield badge, blue"),
    ("st_weaken", "a small cracked downward arrow badge, purple"),
    ("st_skill_tax", "a small padlock over a mana drop badge, teal"),
    ("st_summon", "a small skull portal badge, violet and bone"),
]

BACKGROUNDS = [
    ("bg_lobby", "640x360", "a grand prism hall lobby: three tall stained-glass columns, a polished obsidian floor with teal reflections, gold filigree arches, empty center for UI, no characters"),
    ("bg_draft", "640x360", "a war room with a huge round strategy table, floating holographic map, banners of teal and crimson, candlelight, empty center"),
    ("bg_arena_colosseum", "640x360", "a stone colosseum arena at dusk, two raised side platforms, torches, sand floor with a circular dais at the center, distant crowd silhouettes, no characters"),
    ("bg_arena_temple", "640x360", "a crystal temple arena, floating prism shards, teal and violet light beams, polished floor with a circular dais, no characters"),
    ("bg_arena_frost", "640x360", "a frozen arena, ice pillars, blue mist, cracked frozen floor with a circular dais, no characters"),
    ("bg_result_victory", "640x360", "a radiant victory backdrop: golden light rays from the top, floating dust, dark vignette edges, no characters"),
    ("bg_boot", "640x360", "a dark boot splash: deep space gradient with faint prism constellation lines, a soft teal glow at the center, no text"),
]

FX = [
    ("fx_slash", 5, "96x96", "a crescent sword slash arc, white core with cyan edge, motion streaks"),
    ("fx_impact", 4, "64x64", "a radial hit burst, white core, orange sparks, expanding ring"),
    ("fx_fire", 6, "96x96", "a fire explosion, yellow core, orange tongues, red smoke"),
    ("fx_poison", 6, "96x96", "a bubbling poison cloud, green core, purple haze"),
    ("fx_heal", 5, "64x64", "soft healing sparkles rising, white-gold motes"),
    ("fx_shield", 4, "64x64", "a hexagonal shield flash, violet facets, bright rim"),
    ("fx_lightning", 4, "64x64", "a jagged lightning bolt, white core, cyan glow"),
    ("fx_bomb", 6, "96x96", "a bomb explosion, white flash, orange fireball, dark smoke ring"),
    ("fx_rainbow", 6, "128x128", "a rainbow prism sweep, seven-color band, white core"),
    ("fx_crit", 3, "64x64", "a critical hit flash, four-point star, gold and white"),
    ("fx_death", 5, "96x96", "a death dissolve, dark purple particles collapsing inward"),
    ("fx_summon", 5, "96x96", "a violet summoning glyph, rune circle, rising bone particles"),
    ("fx_buff", 4, "64x64", "a golden buff aura rising, upward chevrons"),
    ("fx_debuff", 4, "64x64", "a dark debuff smoke, purple downward wisps"),
    ("fx_turn_flash", 3, "640x64", "a horizontal turn-change flash, teal to transparent gradient"),
    ("fx_victory_rays", 8, "256x256", "rotating golden victory rays, soft glow, transparent center"),
    ("fx_defeat_vignette", 1, "640x360", "a dark defeat vignette, crimson edges fading to black, transparent center"),
]


def sprite_prompt(hero, state, state_clause, frames):
    w = frames * 160
    return (
        f"Full-body game sprite of {hero['name']}, {hero['desc']}. "
        f"The character is shown {state_clause.format(weapon=hero['weapon'], accent=hero['accent'])}. "
        f"The character faces right in a three-quarter view, feet on a common ground line, "
        f"centered with a small margin, isolated on a transparent background, one character per frame, "
        f"identical scale and equipment in every frame, no scenery, no shadow. "
        f"Sprite sheet {w}x160, exactly {frames} frames in one horizontal row with no gaps. {STYLE}"
    )


def build() -> str:
    out: list[str] = []
    add = out.append
    add("# ART PROMPTS — Prism Pact (Retro Diffusion)\n")
    add("> Sinh tự động từ `tools/art/gen_prompts.py`. Mỗi prompt tự đứng một mình: đã gồm mô tả nhân vật,")
    add("> state animation và style block. Cứ copy nguyên khối code là dán được.\n")
    add("---\n")
    add("## 0. Cách dùng & setting chung\n")
    add("| Mục | Giá trị |")
    add("|---|---|")
    add("| Model | model pixel art chất lượng cao nhất đang có (RD Pro/Plus nếu có) |")
    add("| Palette | 16 màu, bám bảng màu trong `ART_BIBLE.md` |")
    add("| Outline | 1px `#14101c` |")
    add("| Background | trong suốt (trừ background scene) |")
    add("| Scale | 1:1, không upscale trong model |")
    add("")
    add("**Negative dùng chung:** `blurry, anti-aliased, 3d render, photorealistic, extra limbs, deformed hands, "
        "text, letters, watermark, UI frame, drop shadow, background scenery, multiple characters`\n")
    add("> Với sprite sheet: thêm `inconsistent character, changing outfit, uneven spacing, cropped frame`.\n")
    add("**Quy ước:** sprite nhìn sang phải, chân cùng ground line, sheet ngang đúng 160px/frame. "
        "Bên địch flipX trong engine, nên chỉ cần vẽ một hướng.\n")
    add("> Nếu model không giữ nổi sheet: sinh từng frame (thêm `single frame, frame 2 of 4` vào prompt) "
        "rồi ghép strip trong Aseprite; portrait 96×96 downscale thành avatar 48×48.\n")
    add("> Ảnh rộng hơn 1024px (button 4 state, sheet 5 frame) thì sinh từng state/frame rồi ghép; "
        "đừng để model tự thu nhỏ.\n")
    add("---\n")
    add("## 1. Nhân vật (20 hero × 9 ảnh)\n")

    for hero in HEROES:
        add(f"### {hero['name']} — `char/{hero['id']}/`\n")

        add(f"**{hero['id']}_portrait.png · 96×96**\n")
        add("```text")
        add(
            f"96x96 bust portrait of {hero['name']}, {hero['desc']}. "
            f"Head and shoulders, three-quarter view facing slightly right, confident neutral expression, "
            f"isolated on a transparent background, no scenery, no frame, centered with a small margin. {STYLE}"
        )
        add("```\n")

        add(f"**{hero['id']}_icon32.png · 32×32**\n")
        add("```text")
        add(
            f"32x32 archetype icon for {hero['name']}: {hero['symbol']}. "
            f"Bold readable silhouette at 1x, thick dark outline, 8-color palette, centered, "
            f"transparent background. {STYLE_UI}"
        )
        add("```\n")

        add(f"**{hero['id']}_skill.png · 64×64**\n")
        add("```text")
        add(
            f"64x64 skill icon for {hero['name']}: {hero['skill']}. "
            f"Ornate gold border, dark radial background, one strong focal shape readable at 24px, "
            f"centered, no text. {STYLE_UI}"
        )
        add("```\n")

        for state, cfg in STATES.items():
            add(f"**{hero['id']}_{state}.png · {cfg['frames'] * 160}×160**\n")
            add("```text")
            add(sprite_prompt(hero, state, cfg["clause"], cfg["frames"]))
            add("```\n")

    add("---\n")
    add("## 2. UI\n")
    for uid, size, desc in UI:
        add(f"**{uid}.png · {size}**\n")
        add("```text")
        add(f"{size.split('x')[0]}x{size.split('x')[1]} {desc}, isolated on a transparent background, centered. {STYLE_UI}")
        add("```\n")

    add("---\n")
    add("## 3. Gem & status\n")
    add("### 3.1 Gem (48×48)\n")
    for gid, size, desc in GEMS:
        add(f"**{gid}.png · {size}**\n")
        add("```text")
        add(f"48x48 {desc}, thick dark outline, bright rim light, centered, transparent background. {STYLE_UI}")
        add("```\n")

    add("### 3.2 Status icon (24×24)\n")
    for sid, desc in STATUS:
        add(f"**{sid}.png · 24×24**\n")
        add("```text")
        add(f"24x24 status icon: {desc}, thick dark outline, readable at 1x, centered, transparent background. {STYLE_UI}")
        add("```\n")

    add("---\n")
    add("## 4. Background & khung cảnh\n")
    for bid, size, desc in BACKGROUNDS:
        w, h = size.split("x")
        add(f"**{bid}.png · {size}**\n")
        add("```text")
        add(f"{w}x{h} {desc}. Wide 16:9 composition with a clear empty center for gameplay. {STYLE_BG}")
        add("```\n")

    add("---\n")
    add("## 5. Hiệu ứng\n")
    for fid, frames, size, desc in FX:
        w, h = size.split("x")
        add(f"**{fid}.png · {size} · {frames} frame**\n")
        add("```text")
        add(
            f"{w}x{h} effect sprite sheet: {desc}. Exactly {frames} frames in one horizontal row, "
            f"evenly spaced, transparent background, bright additive core. {STYLE_FX}"
        )
        add("```\n")

    add("---\n")
    add("## 6. Kiểm tra sau khi sinh\n")
    add("1. Đúng size, nền trong suốt, không dính viền trắng.")
    add("2. Sprite sheet đủ frame, không lệch ground line.")
    add("3. Quantize về palette chung; `lint_sprite` sạch pixel lạc.")
    add("4. Nhìn 1x: nhận ra tướng trong 0.5 giây.")
    add("5. Cùng tướng: portrait / icon / sprite phải khớp màu và trang bị.\n")
    return "\n".join(out)


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "ART_PROMPTS.md")
    text = build()
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"wrote {path}: {len(text.splitlines())} lines, {len(text)} chars")
