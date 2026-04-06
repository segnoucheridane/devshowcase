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
  params: {
    folder: 'devshowcase/projects/assets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf', 'doc', 'docx', 'zip', 'tar', 'gz', 'txt', 'md'],
    resource_type: 'auto',
  },
});


// 5. Milestone Media (images, videos, documents)

const milestoneMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'devshowcase/projects/milestones',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf', 'doc', 'docx', 'txt', 'md'],
    resource_type: 'auto',
  },
});


// 6. License Files (documents only)

const licenseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'devshowcase/licenses',
    allowed_formats: ['pdf', 'txt', 'doc', 'docx', 'md'],
    resource_type: 'raw',
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