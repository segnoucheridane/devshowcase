const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// 1. User Avatars (images only)

const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'devshowcase/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

// 2. Project Thumbnails (images only)

const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'devshowcase/projects/thumbnails',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'limit' }],
  },
});


// 3. Project Gallery (images only)

const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'devshowcase/projects/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }],
  },
});


// 4. Project Assets (documents, code, images, videos)

const projectAssetsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const fileType = file.mimetype;
    let resourceType = 'auto';
    let folder = 'devshowcase/projects/assets';
    let allowedFormats = [];

    if (fileType.startsWith('image/')) {
      resourceType = 'image';
      folder = 'devshowcase/projects/assets/images';
      allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    } 
    else if (fileType.startsWith('video/')) {
      resourceType = 'video';
      folder = 'devshowcase/projects/assets/videos';
      allowedFormats = ['mp4', 'mov', 'webm', 'avi'];
    }
    else if (fileType === 'application/pdf') {
      resourceType = 'raw';
      folder = 'devshowcase/projects/assets/documents';
      allowedFormats = ['pdf'];
    }
    else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      resourceType = 'raw';
      folder = 'devshowcase/projects/assets/documents';
      allowedFormats = ['doc', 'docx'];
    }
    else if (fileType === 'application/zip' || fileType === 'application/x-zip-compressed' || fileType === 'application/x-tar' || fileType === 'application/gzip') {
      resourceType = 'raw';
      folder = 'devshowcase/projects/assets/code';
      allowedFormats = ['zip', 'tar', 'gz'];
    }
    else if (fileType === 'text/plain' || fileType === 'text/markdown') {
      resourceType = 'raw';
      folder = 'devshowcase/projects/assets/documents';
      allowedFormats = ['txt', 'md'];
    }
    else {
      resourceType = 'raw';
      folder = 'devshowcase/projects/assets/other';
    }

    return {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: allowedFormats,
      use_filename: true,
      unique_filename: true,
    };
  },
});


// 5. Milestone Media (images, videos, documents)

const milestoneMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const fileType = file.mimetype;
    let resourceType = 'auto';
    let folder = 'devshowcase/projects/milestones';

    if (fileType.startsWith('image/')) {
      resourceType = 'image';
    } else if (fileType.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw';
    }

    return {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf', 'doc', 'docx', 'txt', 'md'],
    };
  },
});


// 6. License Files (documents only)

const licenseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'devshowcase/licenses',
    resource_type: 'raw',
    allowed_formats: ['pdf', 'txt', 'doc', 'docx', 'md'],
    use_filename: true,
  },
});


// Multer upload instances with size limits

const uploadAvatar = multer({ 
  storage: avatarStorage, 
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadThumbnail = multer({ 
  storage: thumbnailStorage, 
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadGallery = multer({ 
  storage: galleryStorage, 
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadProjectAssets = multer({ 
  storage: projectAssetsStorage, 
  limits: { fileSize: 100 * 1024 * 1024 }
});

const uploadMilestoneMedia = multer({ 
  storage: milestoneMediaStorage, 
  limits: { fileSize: 50 * 1024 * 1024 }
});

const uploadLicense = multer({ 
  storage: licenseStorage, 
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadThumbnail,
  uploadGallery,
  uploadProjectAssets,
  uploadMilestoneMedia,
  uploadLicense,
};