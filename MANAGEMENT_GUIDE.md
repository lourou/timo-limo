# Photo Management Guide

## Overview

The management interface allows you to flag photos as deleted and export photos in bulk with original filenames and metadata.

## Accessing the Management Interface

Navigate to `/manage` (same password as gallery access).

## Features

### 1. Deletion Flag System

Photos can be flagged as deleted without actually removing them from storage. Deleted photos:
- Are hidden from the gallery and preview views
- Can be restored at any time
- Are marked with `__DELETED__` prefix in the comment field

**How deletion works:**
- The deletion flag is stored in the `comment` field of the database
- Format: `__DELETED__<original_comment>`
- Deleted photos are filtered out in all public views (gallery, preview)
- Management view shows ALL photos (deleted photos appear with reduced opacity and trash icon)

### 2. Batch Organization

Photos are automatically grouped by upload batch (uploader session):
- Each batch shows uploader name, date, photo count, and batch comment
- Batches can be expanded/collapsed
- Photos are organized by original upload order within each batch

### 3. Bulk Export

Two export options are available:

#### Export Single Batch
- Click "Export Batch" button on any batch
- Downloads a ZIP file containing:
  - All non-deleted photos from that batch
  - Original filenames preserved
  - `metadata.json` with batch info and photo metadata

#### Export All Photos
- Click "Export All" button in header
- Downloads a ZIP file containing:
  - Folders for each batch (named: "UploaderName - Date")
  - All non-deleted photos with original filenames
  - `metadata.json` in each batch folder

**Export Process:**
- Photos are downloaded in batches of 5 to avoid overwhelming the browser
- Progress indicator shows download/zip progress
- Original images are downloaded (not thumbnails) preserving all EXIF metadata
- Export works entirely client-side using JSZip

### 4. Metadata Included in Export

The `metadata.json` file in each batch folder contains:
```json
{
  "uploader": "User Name",
  "batchComment": "Batch comment if any",
  "uploadDate": "2025-01-08T12:00:00.000Z",
  "photoCount": 25,
  "photos": [
    {
      "filename": "IMG_1234.jpg",
      "uploadedAt": "2025-01-08T12:05:00.000Z",
      "comment": "Photo comment if any"
    }
  ]
}
```

**Note on File Creation Dates:**
- The metadata includes the date photos were uploaded to the system
- Original EXIF data (including creation date) is preserved in the image files themselves
- To view original creation dates, use an EXIF reader on the exported images

## Technical Details

### Database Schema
No schema changes required - uses existing `comment` field in `photos` table.

### Deletion Flag Format
- Prefix: `__DELETED__`
- Example: `__DELETED__This was a great photo`
- Photos with this prefix are filtered out in public views

### API Endpoints

**Toggle Deletion:**
```
POST /api/photos/delete
Body: { photoId: string, deleted: boolean }
```

**Export Data:**
```
GET /api/photos/export?batchId=<id>  # Export specific batch
GET /api/photos/export               # Export all batches
```

**Photos with Filter:**
```
GET /api/photos?includeDeleted=true  # Include deleted photos
GET /api/photos                      # Only non-deleted photos (default)
```

### Export Limitations

**Browser Memory:**
- Exporting 600 high-resolution images may require 2-4GB of browser memory
- If export fails, try:
  - Closing other browser tabs
  - Exporting individual batches instead of all at once
  - Using a desktop browser (not mobile)

**Cloudflare Pages Compatibility:**
- Export is client-side, no server processing
- Works within Cloudflare Pages limitations
- No server storage or temporary files needed

## Workflow Example

1. Access management interface at `/manage`
2. Review photos by batch
3. Mark unwanted photos as deleted (they won't appear in gallery)
4. Export desired batches or all photos
5. Receive ZIP file with:
   - Original filenames
   - Organized by uploader
   - Metadata JSON for reference
6. If needed, restore deleted photos by clicking "Restore"

## Future Enhancements

Potential improvements:
- Batch operations (delete/restore multiple photos at once)
- Search/filter by uploader name
- Date range filtering
- Direct download of single photos
- Permanent deletion option (actually remove from storage)
