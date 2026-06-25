# Custom Cards

Custom cards are local, user-authored cards. They are separate from the canonical deck CSV files and are stored in the browser library under `dsd.customCardsLibrary`. Session exports also include the custom cards needed to resolve placed custom-card instances.

## CSV Schema

The custom-card CSV format is intentionally small and spreadsheet-friendly.

Required column:

- `cardname`

Supported columns:

- `cardname`
- `scientific_twin`
- `domain`
- `subdomain`
- `keywords`
- `summary`
- `question`
- `story`
- `effect_good`
- `effect_bad`
- `effect_mod`
- `background_image`
- `notes`

Field mapping:

- `cardname` -> `card.cardname`
- `scientific_twin` -> `card.twin`
- `effect_good` -> `card.effectGood`
- `effect_bad` -> `card.effectBad`
- `effect_mod` -> `card.effectMod`
- `background_image` -> `card.imagePath` / `card.frontImage`
- `notes` -> `card.raw.notes`

The importer also accepts these aliases when present:

- `name` or `card_name` for `cardname`
- `twin` or `scientificTwin` for `scientific_twin`
- `effectGood` for `effect_good`
- `effectBad` for `effect_bad`
- `effectMod` for `effect_mod`
- `imagePath` or `image_path` for `background_image`

`keywords` may be separated by commas or semicolons.

Rows without `cardname` are skipped and reported in the import summary. Imported cards receive new `custom:<id>` identifiers so canonical deck cards and source CSV files are never modified.

## JSON Format

JSON export is the most faithful format:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-05-18T00:00:00.000Z",
  "app": "data-science-deck-app",
  "customCards": []
}
```

If an imported JSON card ID already exists in the local custom-card library, the importer keeps both cards by assigning the imported card a new unique custom ID.
