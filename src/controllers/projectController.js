const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { createUniqueSlug } = require('../utils/slugify');
const { prisma } = require('../config/prisma');

const listProjects = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      technology,
      industry,
      status,
      sort = 'created_at',
      fundingOpen,
      forSale,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where conditions
    let where = {
      visibility: 'public',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { problem_solved: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (technology) {
      where.technologies = { has: technology };
    }

    if (industry) {
      where.industries = { has: industry };
    }

    if (status) {
      where.status = status;
    }

    if (fundingOpen === 'true') {
      where.is_funding_open = true;
    }

    if (forSale === 'true') {
      where.is_for_sale = true;
    }

    // Determine sort order
    let orderBy = {};
    if (sort === 'created_at') orderBy = { created_at: 'desc' };
    else if (sort === 'view_count') orderBy = { view_count: 'desc' };
    else if (sort === 'like_count') orderBy = { like_count: 'desc' };
    else orderBy = { created_at: 'desc' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    sendResponse(res, 200, projects, null, {
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const isId = /^\d+$/.test(project_id);
    
    let project;
    if (isId) {
      project = await prisma.project.findUnique({
        where: { id: parseInt(project_id) },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              reputation_score: true,
            }
          }
        }
      });
    } else {
      project = await prisma.project.findUnique({
        where: { slug: project_id },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              reputation_score: true,
            }
          }
        }
      });
    }

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    // Check private visibility
    if (project.visibility === 'private') {
      if (!req.user || req.user.id !== project.owner_id) {
        return next(new ApiError(403, 'This project is private.'));
      }
    }

    // Increment view count if not owner
    if (!req.user || req.user.id !== project.owner_id) {
      await prisma.project.update({
        where: { id: project.id },
        data: { view_count: { increment: 1 } }
      });
      project.view_count += 1;
    }

    sendResponse(res, 200, project);
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      full_description,
      status,
      visibility,
      technologies,
      industries,
      tags,
      problem_solved,
      repo_url,
      demo_url,
    } = req.body;

    if (!title || !description) {
      return next(new ApiError(400, 'Title and description are required.'));
    }

    const slug = createUniqueSlug(title);

    const newProject = await prisma.project.create({
      data: {
        owner_id: req.user.id,
        title,
        slug,
        description,
        full_description: full_description || null,
        status: status || 'idea',
        visibility: visibility || 'public',
        technologies: technologies || [],
        industries: industries || [],
        tags: tags || [],
        problem_solved: problem_solved || null,
        repo_url: repo_url || null,
        demo_url: demo_url || null,
      }
    });

    sendResponse(res, 201, newProject, 'Project created.');
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    
    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    const { title, description, full_description, problem_solved, repo_url, demo_url, tags } = req.body;

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        full_description: full_description !== undefined ? full_description : undefined,
        problem_solved: problem_solved !== undefined ? problem_solved : undefined,
        repo_url: repo_url !== undefined ? repo_url : undefined,
        demo_url: demo_url !== undefined ? demo_url : undefined,
        tags: tags !== undefined ? tags : undefined,
      }
    });

    sendResponse(res, 200, updatedProject, 'Project updated.');
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    
    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, title: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    await prisma.project.delete({
      where: { id: parseInt(project_id) }
    });

    sendResponse(res, 200, null, `Project "${project.title}" deleted.`);
  } catch (err) {
    next(err);
  }
};

const addTechnology = async (req, res, next) => {
  try {
    const { technology } = req.body;
    const { project_id } = req.params;

    if (!technology) {
      return next(new ApiError(400, 'Technology name is required.'));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, technologies: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized.'));
    }

    // Check if technology already exists
    if (!project.technologies.includes(technology)) {
      const updatedProject = await prisma.project.update({
        where: { id: parseInt(project_id) },
        data: {
          technologies: { push: technology }
        },
        select: { technologies: true }
      });
      sendResponse(res, 200, updatedProject, 'Technology added.');
    } else {
      sendResponse(res, 200, { technologies: project.technologies }, 'Technology already exists.');
    }
  } catch (err) {
    next(err);
  }
};

const removeTechnology = async (req, res, next) => {
  try {
    const { project_id, tech } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, technologies: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized.'));
    }

    const updatedTechnologies = project.technologies.filter(t => t !== tech);

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: {
        technologies: updatedTechnologies
      },
      select: { technologies: true }
    });

    sendResponse(res, 200, updatedProject, 'Technology removed.');
  } catch (err) {
    next(err);
  }
};

const addIndustry = async (req, res, next) => {
  try {
    const { industry } = req.body;
    const { project_id } = req.params;

    if (!industry) {
      return next(new ApiError(400, 'Industry name is required.'));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, industries: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized.'));
    }

    if (!project.industries.includes(industry)) {
      const updatedProject = await prisma.project.update({
        where: { id: parseInt(project_id) },
        data: {
          industries: { push: industry }
        },
        select: { industries: true }
      });
      sendResponse(res, 200, updatedProject, 'Industry added.');
    } else {
      sendResponse(res, 200, { industries: project.industries }, 'Industry already exists.');
    }
  } catch (err) {
    next(err);
  }
};

const updateVisibility = async (req, res, next) => {
  try {
    const { visibility } = req.body;
    const { project_id } = req.params;

    const allowed = ['public', 'private', 'unlisted'];

    if (!allowed.includes(visibility)) {
      return next(new ApiError(400, "Visibility must be 'public', 'private', or 'unlisted'."));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized.'));
    }

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: { visibility },
      select: { id: true, title: true, visibility: true }
    });

    sendResponse(res, 200, updatedProject, `Visibility set to ${visibility}.`);
  } catch (err) {
    next(err);
  }
};


// MEDIA UPLOAD FUNCTIONS


const { cloudinary } = require('../config/cloudinary');

//Upload project thumbnail
 
const uploadThumbnail = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    if (!req.file) {
      return next(new ApiError(400, 'No file uploaded'));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, thumbnail_url: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized'));
    }

    if (project.thumbnail_url) {
      const publicId = project.thumbnail_url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`devshowcase/projects/thumbnails/${publicId}`);
    }

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: { thumbnail_url: req.file.path },
    });

    sendResponse(res, 200, updatedProject, 'Thumbnail uploaded');
  } catch (err) {
    next(err);
  }
};


//Upload gallery images to project
 
const uploadGallery = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    if (!req.files || req.files.length === 0) {
      return next(new ApiError(400, 'No files uploaded'));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, gallery: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized'));
    }

    const imageUrls = req.files.map(file => file.path);
    const currentGallery = project.gallery || [];
    const newGallery = [...currentGallery, ...imageUrls];

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: { gallery: newGallery },
    });

    sendResponse(res, 200, updatedProject, `${req.files.length} image(s) added to gallery`);
  } catch (err) {
    next(err);
  }
};


//Remove gallery image
 
const removeGalleryImage = async (req, res, next) => {
  try {
    const { project_id, image_id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, gallery: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized'));
    }

    const imageToDelete = project.gallery?.[parseInt(image_id)];
    if (imageToDelete) {
      const publicId = imageToDelete.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`devshowcase/projects/gallery/${publicId}`);
    }

    const newGallery = project.gallery.filter((_, index) => index !== parseInt(image_id));

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: { gallery: newGallery },
    });

    sendResponse(res, 200, updatedProject, 'Image removed from gallery');
  } catch (err) {
    next(err);
  }
};


//Upload project assets (code, docs, images, videos)
 
const uploadProjectAssets = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    if (!req.files || req.files.length === 0) {
      return next(new ApiError(400, 'No files uploaded'));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, assets: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ApiError(403, 'Not authorized'));
    }

    const uploadedAssets = req.files.map(file => ({
      url: file.path,
      filename: file.originalname,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));

    const currentAssets = project.assets || [];
    const newAssets = [...currentAssets, ...uploadedAssets];

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: { assets: newAssets },
    });

    sendResponse(res, 200, {
      assets: uploadedAssets,
      total: uploadedAssets.length,
    }, `${uploadedAssets.length} asset(s) uploaded successfully`);
  } catch (err) {
    next(err);
  }
};


//Delete project asset

const deleteProjectAsset = async (req, res, next) => {
  try {
    const { project_id, asset_id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true, assets: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ApiError(403, 'Not authorized'));
    }

    const assetIndex = parseInt(asset_id);
    const assetToDelete = project.assets?.[assetIndex];

    if (!assetToDelete) {
      return next(new ApiError(404, 'Asset not found'));
    }

    const publicId = assetToDelete.url.split('/').pop().split('.')[0];
    let folder = 'devshowcase/projects/assets/other';
    
    if (assetToDelete.url.includes('/images/')) folder = 'devshowcase/projects/assets/images';
    else if (assetToDelete.url.includes('/videos/')) folder = 'devshowcase/projects/assets/videos';
    else if (assetToDelete.url.includes('/documents/')) folder = 'devshowcase/projects/assets/documents';
    else if (assetToDelete.url.includes('/code/')) folder = 'devshowcase/projects/assets/code';
    
    await cloudinary.uploader.destroy(`${folder}/${publicId}`, {
      resource_type: assetToDelete.type.startsWith('video/') ? 'video' : 
                     assetToDelete.type.startsWith('image/') ? 'image' : 'raw'
    });

    const newAssets = project.assets.filter((_, index) => index !== assetIndex);

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(project_id) },
      data: { assets: newAssets },
    });

    sendResponse(res, 200, null, 'Asset deleted successfully');
  } catch (err) {
    next(err);
  }
};


//Get all project assets
 
const getProjectAssets = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { assets: true, visibility: true, owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.visibility === 'private') {
      if (!req.user || (req.user.id !== project.owner_id && req.user.role !== 'admin')) {
        return next(new ApiError(403, 'This project is private'));
      }
    }

    sendResponse(res, 200, project.assets || []);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTechnology,
  removeTechnology,
  addIndustry,
  updateVisibility,
  uploadThumbnail,
  uploadGallery,
  removeGalleryImage,
  uploadProjectAssets,
  deleteProjectAsset,
  getProjectAssets,
};