const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploadDir = (dirName) => {
  const dirPath = path.join(__dirname, '..', 'public', 'uploads', dirName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

const memberUploadDir = createUploadDir('members');
const avatarUploadDir = createUploadDir('avatars');
const announcementUploadDir = createUploadDir('announcements');

const getStorage = (uploadDir) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, GIF, WEBP) are allowed.'));
  }
};

const upload = multer({
  storage: getStorage(memberUploadDir),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadAvatar = multer({
  storage: getStorage(avatarUploadDir),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadAnnouncement = multer({
  storage: getStorage(announcementUploadDir),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

function deletePhoto(photoPath) {
  if (!photoPath) return;
  const fullPath = path.join(__dirname, '..', 'public', photoPath.replace(/^\//, ''));
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch(err) {
      console.error('Error deleting photo:', err);
    }
  }
}

module.exports = { upload, uploadAvatar, uploadAnnouncement, deleteMemberPhoto: deletePhoto, deletePhoto };
