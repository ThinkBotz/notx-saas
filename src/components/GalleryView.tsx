import React, { useState } from 'react';
import { UserProfile, Album } from '../types';
import { addAlbum, deleteAlbum, updateAlbum } from '../firebase';
import { 
  Image as ImageIcon, 
  X, 
  Plus, 
  Calendar, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle, 
  Loader2
} from 'lucide-react';
import ImageUploader from './ImageUploader';
import HoldButton from './HoldButton';

interface GalleryViewProps {
  user: UserProfile;
  albums: Album[];
  refreshData: () => void;
  activeTenantId?: string;
}

export default function GalleryView({ user, albums, refreshData, activeTenantId }: GalleryViewProps) {
  const isAdminOrCoordinator = Boolean(
    user.role === 'admin' || 
    user.role === 'coordinator' || 
    user.role === 'president' || 
    user.powers?.canManageGallery
  );

  const canModifyAlbum = (album?: Album | null) => {
    if (!album) return false;
    return Boolean(
      isAdminOrCoordinator || 
      (album.uploadedBy && album.uploadedBy.toLowerCase() === user.name.toLowerCase())
    );
  };
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number | null>(null);
  
  // Create Album Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Album['category']>('Cultural Events');
  const [images, setImages] = useState<string[]>([]);
  const [createUrlInput, setCreateUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit Album Form State
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<Album['category']>('Cultural Events');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editUrlInput, setEditUrlInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Confirmation Modals State
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [photoToDeleteIdx, setPhotoToDeleteIdx] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open Edit Modal
  const openEditModal = (album: Album, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAlbum(album);
    setEditTitle(album.title);
    setEditDescription(album.description);
    setEditCategory(album.category);
    setEditImages([...album.images]);
    setEditThumbnailUrl(album.thumbnailUrl || album.images[0] || '');
    setEditUrlInput('');
    setEditError('');
  };

  // Add photo via URL in Create Modal
  const handleAddCreateUrl = () => {
    const trimmed = createUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('Please provide a valid web image URL starting with http:// or https://');
      return;
    }
    setImages(prev => [...prev, trimmed]);
    setCreateUrlInput('');
    setError('');
  };

  // Add photo via URL in Edit Modal
  const handleAddEditUrl = () => {
    const trimmed = editUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setEditError('Please provide a valid web image URL starting with http:// or https://');
      return;
    }
    setEditImages(prev => [...prev, trimmed]);
    setEditUrlInput('');
    setEditError('');
  };

  // Create Album
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || images.length === 0) {
      setError("Please provide title, description, and at least one image.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const albumId = `album_${Date.now()}`;
      const newAlbum: Album = {
        albumId,
        tenantId: activeTenantId || user.tenantId,
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: images[0],
        images,
        category,
        uploadedBy: user.name,
        createdAt: new Date().toISOString()
      };
      
      await addAlbum(newAlbum);
      refreshData();
      setShowAddModal(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('Cultural Events');
      setImages([]);
      setCreateUrlInput('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create album');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Edited Album
  const handleUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum) return;
    if (!editTitle.trim() || !editDescription.trim() || editImages.length === 0) {
      setEditError("Please provide an album title, description, and at least one photo.");
      return;
    }

    setIsUpdating(true);
    setEditError('');

    const finalThumbnail = editImages.includes(editThumbnailUrl) 
      ? editThumbnailUrl 
      : (editImages[0] || '');

    try {
      const updates: Partial<Album> = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        images: editImages,
        thumbnailUrl: finalThumbnail
      };

      await updateAlbum(editingAlbum.albumId, updates);
      
      const updatedAlbumState: Album = {
        ...editingAlbum,
        ...updates
      };

      if (selectedAlbum && selectedAlbum.albumId === editingAlbum.albumId) {
        setSelectedAlbum(updatedAlbumState);
      }

      refreshData();
      setEditingAlbum(null);
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Failed to update album');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Individual Photo Confirm
  const confirmDeletePhoto = async () => {
    if (photoToDeleteIdx === null || !selectedAlbum) return;
    setIsDeleting(true);

    const idxToRemove = photoToDeleteIdx;
    const newImages = selectedAlbum.images.filter((_, idx) => idx !== idxToRemove);
    const newThumbnailUrl = newImages.length > 0 
      ? (selectedAlbum.thumbnailUrl === selectedAlbum.images[idxToRemove] ? newImages[0] : selectedAlbum.thumbnailUrl)
      : '';

    try {
      await updateAlbum(selectedAlbum.albumId, { 
        images: newImages, 
        thumbnailUrl: newThumbnailUrl 
      });

      const updatedAlbum: Album = {
        ...selectedAlbum,
        images: newImages,
        thumbnailUrl: newThumbnailUrl
      };

      setSelectedAlbum(updatedAlbum);
      refreshData();

      // If viewing active image in lightbox
      if (activeImageIdx !== null) {
        if (newImages.length === 0) {
          setActiveImageIdx(null);
        } else if (activeImageIdx >= newImages.length) {
          setActiveImageIdx(newImages.length - 1);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
      setPhotoToDeleteIdx(null);
    }
  };

  // Delete Entire Album Confirm
  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAlbum(albumToDelete.albumId);
      refreshData();
      if (selectedAlbum?.albumId === albumToDelete.albumId) {
        setSelectedAlbum(null);
      }
      setAlbumToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================
  // INSIDE ALBUM VIEW
  // ==========================================
  if (selectedAlbum) {
    return (
      <div className="flex-1 overflow-y-auto bg-[var(--nb-bg)] text-[var(--nb-content)] pb-36 sm:pb-32">
        {/* Album Header Bar */}
        <div 
          className="sticky top-0 bg-[var(--nb-surface)] z-30 p-4"
          style={{ borderBottom: '2px solid var(--nb-ink)' }}
        >
          <div className="flex justify-between items-start sm:items-center gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="nb-tag text-[9px] font-bold">
                  {selectedAlbum.category}
                </span>
                <span className="nb-tag-muted text-[10px]">
                  {selectedAlbum.images.length} Photos
                </span>
              </div>
              <h2 className="nb-headline text-xl sm:text-2xl mt-1.5">{selectedAlbum.title}</h2>
              <div className="flex items-center gap-3 text-xs text-[var(--nb-secondary)] font-mono mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--nb-accent)]" /> 
                  {new Date(selectedAlbum.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[var(--nb-accent)]" /> 
                  By {selectedAlbum.uploadedBy}
                </span>
              </div>
            </div>

            {/* Album Header Actions */}
            <div className="flex items-center gap-2">
              {canModifyAlbum(selectedAlbum) && (
                <>
                  <button 
                    type="button"
                    onClick={() => openEditModal(selectedAlbum)}
                    className="nb-btn-ghost text-xs !min-h-[38px] px-3 cursor-pointer"
                    title="Edit Name, Description & Photos"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Album</span>
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAlbumToDelete(selectedAlbum);
                    }}
                    className="nb-btn nb-btn-danger text-xs !min-h-[38px] px-3 cursor-pointer"
                    title="Delete Album"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete Album</span>
                  </button>
                </>
              )}

              <button 
                type="button"
                onClick={() => setSelectedAlbum(null)}
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Back to Gallery"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {selectedAlbum.description && (
            <p 
              className="text-xs text-[var(--nb-secondary)] mt-3 leading-relaxed max-w-3xl p-3 rounded-md bg-[var(--nb-surface-accent)] font-sans"
              style={{ border: '1px solid var(--nb-divider)' }}
            >
              {selectedAlbum.description}
            </p>
          )}
        </div>
        
        {/* Photo Gallery Grid */}
        <div className="p-4">
          {selectedAlbum.images.length === 0 ? (
            <div 
              className="py-16 text-center rounded-lg bg-[var(--nb-surface)] p-6"
              style={{ border: '2px dashed var(--nb-divider)' }}
            >
              <div 
                className="w-12 h-12 rounded-md mx-auto mb-3 flex items-center justify-center bg-[var(--nb-surface-accent)]"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <ImageIcon className="w-6 h-6 text-[var(--nb-accent)]" />
              </div>
              <h4 className="nb-headline text-base">No photos in this album</h4>
              <p className="text-xs text-[var(--nb-secondary)] mt-1 font-sans">Use the Edit Album button above to add pictures.</p>
              {canModifyAlbum(selectedAlbum) && (
                <button
                  type="button"
                  onClick={() => openEditModal(selectedAlbum)}
                  className="nb-btn mt-4 text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Photos Now</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {selectedAlbum.images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImageIdx(idx)}
                  className="relative group aspect-square rounded-md overflow-hidden bg-[var(--nb-surface)] cursor-pointer transition-all"
                  style={{ 
                    border: '2px solid var(--nb-ink)',
                    boxShadow: 'var(--shadow-hard-sm)'
                  }}
                >
                  <img 
                    src={img} 
                    alt={`${selectedAlbum.title} ${idx + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                  />

                  {/* Individual Photo Delete Button */}
                  {canModifyAlbum(selectedAlbum) && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDeleteIdx(idx);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-md transition-all cursor-pointer border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      title="Delete this photo"
                      aria-label="Delete this photo"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}

                  {/* Photo Index Tag */}
                  <div 
                    className="absolute bottom-2 left-2 bg-[var(--nb-ink)] text-[var(--nb-bg)] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold pointer-events-none"
                  >
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox Modal */}
        {activeImageIdx !== null && selectedAlbum.images[activeImageIdx] && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col select-none">
            <div className="flex justify-between items-center p-3.5 sm:p-4 border-b border-white/20 bg-black/80 flex-shrink-0">
              <span className="nb-label text-white">
                Photo {activeImageIdx + 1} of {selectedAlbum.images.length}
              </span>
              <div className="flex items-center gap-2">
                {canModifyAlbum(selectedAlbum) && (
                  <button 
                    type="button"
                    onClick={() => setPhotoToDeleteIdx(activeImageIdx)}
                    className="nb-btn nb-btn-danger text-xs !min-h-[38px] px-3 cursor-pointer"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Photo</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setActiveImageIdx(null)}
                  className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                  title="Close Fullscreen"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative p-3 sm:p-6 overflow-hidden">
              {selectedAlbum.images.length > 1 && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx((prev) => prev !== null ? (prev > 0 ? prev - 1 : selectedAlbum.images.length - 1) : null);
                  }}
                  className="absolute left-3 sm:left-6 w-10 h-10 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)] transition-all cursor-pointer z-20"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}

              <img 
                src={selectedAlbum.images[activeImageIdx]} 
                alt={`${selectedAlbum.title} fullscreen`}
                className="max-w-full max-h-full object-contain rounded-md border border-white/20"
              />

              {selectedAlbum.images.length > 1 && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx((prev) => prev !== null ? (prev < selectedAlbum.images.length - 1 ? prev + 1 : 0) : null);
                  }}
                  className="absolute right-3 sm:right-6 w-10 h-10 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2.5px_2.5px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[var(--nb-surface-accent)] transition-all cursor-pointer z-20"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modals */}
        {renderConfirmModals()}
        {renderEditModal()}
      </div>
    );
  }

  // ==========================================
  // MAIN GALLERY VIEW (ALBUMS LIST)
  // ==========================================
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--nb-bg)] text-[var(--nb-content)] px-4 pt-4 pb-36 sm:pb-32 space-y-5">
      {/* Gallery Header */}
      <div 
        className="p-4 rounded-lg bg-[var(--nb-surface)] flex justify-between items-center gap-3"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-sm)' }}
      >
        <div>
          <h1 className="nb-headline text-2xl leading-none">Gallery Albums</h1>
          <p className="nb-label text-xs text-[var(--nb-secondary)] mt-1">
            Department memories, event snapshots, and visual milestones
          </p>
        </div>
        {isAdminOrCoordinator && (
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="nb-btn text-xs py-2 px-3.5 !min-h-[38px] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Album</span>
          </button>
        )}
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map((album) => {
          const hasRights = canModifyAlbum(album);

          return (
            <div 
              key={album.albumId} 
              onClick={() => setSelectedAlbum(album)}
              className="bg-[var(--nb-surface)] rounded-lg overflow-hidden cursor-pointer flex flex-col relative transition-all group"
              style={{ 
                border: '2px solid var(--nb-ink)',
                boxShadow: 'var(--shadow-hard-sm)'
              }}
            >
              <div 
                className="aspect-video relative overflow-hidden bg-[var(--nb-surface-accent)]"
                style={{ borderBottom: '2px solid var(--nb-ink)' }}
              >
                <img 
                  src={album.thumbnailUrl || album.images[0] || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format'} 
                  alt={album.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                
                {/* Management Action Buttons (Edit + Delete) */}
                {hasRights && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-[2]">
                    <button 
                      type="button"
                      onClick={(e) => openEditModal(album, e)}
                      className="p-1.5 bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] rounded-md border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      title="Edit Album"
                      aria-label="Edit Album"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlbumToDelete(album);
                      }}
                      className="p-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-md border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      title="Delete Album"
                      aria-label="Delete Album"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Photo Count Pill */}
                <div 
                  className="absolute bottom-2.5 right-2.5 bg-[var(--nb-ink)] text-[var(--nb-bg)] px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-[1.5px_1.5px_0_var(--nb-ink)]"
                >
                  <ImageIcon className="w-3 h-3 text-[var(--nb-yellow)]" />
                  <span>{album.images.length} Photos</span>
                </div>

                <div className="absolute bottom-2.5 left-2.5">
                  <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border border-[var(--nb-ink)] shadow-[1.5px_1.5px_0_var(--nb-ink)] uppercase ${
                    album.category === 'Workshops' ? 'nb-pill-blue' :
                    album.category === 'Hackathons' ? 'nb-pill-purple' :
                    album.category === 'Seminars' ? 'nb-pill-green' :
                    album.category === 'Cultural Events' ? 'nb-pill-pink' :
                    album.category === 'Club Meetings' ? 'nb-pill-coral' : 'nb-pill-yellow'
                  }`}>
                    {album.category}
                  </span>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <h3 className="nb-headline text-base tracking-normal line-clamp-1 group-hover:text-[var(--nb-accent)] transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-xs text-[var(--nb-secondary)] line-clamp-2 mt-1 leading-relaxed font-sans">
                    {album.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-[var(--nb-divider)] text-[11px] text-[var(--nb-tertiary)] font-mono">
                  <span>By {album.uploadedBy}</span>
                  <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}

        {albums.length === 0 && (
          <div 
            className="col-span-full py-16 text-center rounded-lg bg-[var(--nb-surface)] p-6"
            style={{ border: '2px dashed var(--nb-divider)' }}
          >
            <div 
              className="w-12 h-12 rounded-md mx-auto mb-3 flex items-center justify-center bg-[var(--nb-surface-accent)]"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <ImageIcon className="w-6 h-6 text-[var(--nb-accent)]" />
            </div>
            <h3 className="nb-headline text-base">No albums available yet</h3>
            <p className="text-[var(--nb-secondary)] text-xs mt-1 font-sans">
              Start by creating the first album for recent department events!
            </p>
            {isAdminOrCoordinator && (
              <button 
                type="button"
                onClick={() => setShowAddModal(true)}
                className="nb-btn mt-4 text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Album</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Album Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          <div 
            className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-md rounded-lg max-h-[90vh] flex flex-col overflow-hidden"
            style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            <div 
              className="flex justify-between items-center p-4 bg-[var(--nb-surface-accent)] flex-shrink-0"
              style={{ borderBottom: '2px solid var(--nb-ink)' }}
            >
              <h3 className="nb-headline text-base flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[var(--nb-accent)]" />
                Create New Album
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} 
                className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="p-4 overflow-y-auto space-y-3.5 text-xs font-sans">
              {error && (
                <div 
                  className="p-2.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center gap-2 font-bold"
                  style={{ border: '1.5px solid currentColor' }}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="nb-label text-[10px] block mb-1">Album Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. AI & ML National Symposium 2026"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="nb-input text-xs" 
                />
              </div>
              
              <div>
                <label className="nb-label text-[10px] block mb-1">Description *</label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="Tell us what this album captures..."
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="nb-input text-xs resize-none leading-relaxed" 
                />
              </div>
              
              <div>
                <label className="nb-label text-[10px] block mb-1">Category *</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as any)} 
                  className="nb-input text-xs cursor-pointer"
                >
                  <option value="Workshops">Workshops</option>
                  <option value="Hackathons">Hackathons</option>
                  <option value="Seminars">Seminars</option>
                  <option value="Cultural Events">Cultural Events</option>
                  <option value="Club Meetings">Club Meetings</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Photos Upload & URL Section */}
              <div className="space-y-2">
                <label className="nb-label text-[10px] block">
                  Photos ({images.length} selected) *
                </label>
                
                <ImageUploader 
                  maxFiles={20} 
                  onUploadSuccess={(urls) => setImages(urls)} 
                  buttonLabel="Upload Photos from Device"
                  uploadPreset={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET}
                  initialImages={images}
                />

                {/* Or Add Photo via URL */}
                <div className="pt-2 border-t border-[var(--nb-divider)]">
                  <span className="nb-label text-[10px] block mb-1">Or add photo via direct URL:</span>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={createUrlInput}
                      onChange={(e) => setCreateUrlInput(e.target.value)}
                      className="nb-input text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddCreateUrl}
                      className="nb-btn-ghost text-xs px-3 !min-h-[40px] cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Preview Selected Photos */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 max-h-32 overflow-y-auto">
                    {images.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        className="relative w-14 h-14 rounded overflow-hidden bg-[var(--nb-surface-accent)]"
                        style={{ border: '1.5px solid var(--nb-ink)' }}
                      >
                        <img src={imgUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 bg-[var(--nb-ink)] text-white p-0.5 rounded cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting || images.length === 0} 
                  className="nb-btn w-full cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Album...</span>
                    </>
                  ) : (
                    <span>Save &amp; Publish Album</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Edit Album Modal */}
      {renderEditModal()}

      {/* Render Confirmation Modals */}
      {renderConfirmModals()}
    </div>
  );

  // ==========================================
  // EDIT ALBUM MODAL (NAME, DESCRIPTION & PHOTOS)
  // ==========================================
  function renderEditModal() {
    if (!editingAlbum) return null;

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
        <div 
          className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-lg rounded-lg max-h-[92vh] flex flex-col overflow-hidden"
          style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
        >
          {/* Header */}
          <div 
            className="flex justify-between items-center p-4 bg-[var(--nb-surface-accent)] flex-shrink-0"
            style={{ borderBottom: '2px solid var(--nb-ink)' }}
          >
            <div>
              <h3 className="nb-headline text-base flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-[var(--nb-accent)]" />
                Edit Album
              </h3>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)] mt-0.5">
                Modify album details or add &amp; remove photos
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setEditingAlbum(null)} 
              className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleUpdateAlbum} className="p-4 overflow-y-auto space-y-3.5 text-xs font-sans flex-1">
            {editError && (
              <div 
                className="p-2.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center gap-2 font-bold"
                style={{ border: '1.5px solid currentColor' }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            
            {/* Album Title */}
            <div>
              <label className="nb-label text-[10px] block mb-1">Album Name / Title *</label>
              <input 
                type="text" 
                required 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                className="nb-input text-xs" 
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="nb-label text-[10px] block mb-1">Description *</label>
              <textarea 
                required 
                rows={3} 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                className="nb-input text-xs resize-none leading-relaxed" 
              />
            </div>
            
            {/* Category */}
            <div>
              <label className="nb-label text-[10px] block mb-1">Category *</label>
              <select 
                value={editCategory} 
                onChange={(e) => setEditCategory(e.target.value as any)} 
                className="nb-input text-xs cursor-pointer"
              >
                <option value="Workshops">Workshops</option>
                <option value="Hackathons">Hackathons</option>
                <option value="Seminars">Seminars</option>
                <option value="Cultural Events">Cultural Events</option>
                <option value="Club Meetings">Club Meetings</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Photos Management */}
            <div className="space-y-3 pt-2 border-t border-[var(--nb-divider)]">
              <div className="flex justify-between items-center">
                <label className="nb-label text-[10px] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
                  Photos in Album ({editImages.length})
                </label>
                <span className="nb-label text-[9px] text-[var(--nb-tertiary)]">Click photo to set as cover</span>
              </div>

              {/* Photos Thumbnail List with Remove and Cover selection */}
              {editImages.length > 0 ? (
                <div 
                  className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto p-2 rounded-md bg-[var(--nb-surface-accent)]"
                  style={{ border: '1.5px solid var(--nb-divider)' }}
                >
                  {editImages.map((imgUrl, idx) => {
                    const isCover = editThumbnailUrl === imgUrl || (!editThumbnailUrl && idx === 0);

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setEditThumbnailUrl(imgUrl)}
                        className="relative group aspect-square rounded overflow-hidden cursor-pointer transition-all"
                        style={{ 
                          border: isCover ? '2.5px solid var(--nb-accent)' : '1.5px solid var(--nb-ink)'
                        }}
                        title="Click to set as album cover thumbnail"
                      >
                        <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        
                        {/* Cover Badge */}
                        {isCover && (
                          <div className="absolute top-1 left-1 bg-[var(--nb-accent)] text-white text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded">
                            Cover
                          </div>
                        )}

                        {/* Remove Photo Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditImages(prev => {
                              const remaining = prev.filter((_, i) => i !== idx);
                              if (editThumbnailUrl === imgUrl) {
                                setEditThumbnailUrl(remaining[0] || '');
                              }
                              return remaining;
                            });
                          }}
                          className="absolute top-1 right-1 bg-[var(--nb-ink)] text-white p-0.5 rounded cursor-pointer"
                          title="Remove this photo from album"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-rose-500 py-1 font-bold">Album must have at least one photo.</p>
              )}

              {/* Upload More Photos */}
              <div className="pt-1">
                <span className="nb-label text-[10px] block mb-1">
                  + Add More Photos to Album:
                </span>
                
                <ImageUploader 
                  maxFiles={25} 
                  onUploadSuccess={(urls) => {
                    setEditImages(prev => {
                      const combined = [...prev];
                      for (const u of urls) {
                        if (!combined.includes(u)) combined.push(u);
                      }
                      return combined;
                    });
                  }} 
                  buttonLabel="Upload Additional Photos from Device"
                  uploadPreset={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET}
                />
              </div>

              {/* Or Add Photo via Direct URL */}
              <div className="pt-2 border-t border-[var(--nb-divider)]">
                <span className="nb-label text-[10px] block mb-1">Or add image via direct URL:</span>
                <div className="flex gap-2">
                  <input 
                    type="url"
                    placeholder="https://example.com/extra-photo.jpg"
                    value={editUrlInput}
                    onChange={(e) => setEditUrlInput(e.target.value)}
                    className="nb-input text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditUrl}
                    className="nb-btn-ghost text-xs px-3 !min-h-[40px] cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[var(--nb-divider)] flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setEditingAlbum(null)}
                className="nb-btn-ghost text-xs !min-h-[40px] px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isUpdating || editImages.length === 0} 
                className="nb-btn text-xs !min-h-[40px] px-5 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // CONFIRMATION MODALS (DELETE ALBUM & DELETE PHOTO)
  // ==========================================
  function renderConfirmModals() {
    return (
      <>
        {/* Delete Entire Album Modal */}
        {albumToDelete && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
            <div 
              className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-sm rounded-lg p-5 text-center space-y-4"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
            >
              <div 
                className="w-12 h-12 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="nb-headline text-lg">Delete Album?</h3>
                <p className="text-xs text-[var(--nb-secondary)] mt-1.5 leading-relaxed font-sans">
                  Are you sure you want to delete <strong className="text-[var(--nb-content)]">&ldquo;{albumToDelete.title}&rdquo;</strong> and all its {albumToDelete.images.length} photos? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setAlbumToDelete(null)}
                  className="nb-btn-ghost flex-1 text-xs !min-h-[40px] cursor-pointer"
                >
                  Cancel
                </button>
                <HoldButton
                  size="sm"
                  holdTime={2000}
                  backgroundColor="var(--nb-surface-accent)"
                  fillColor="var(--nb-accent)"
                  textColor="var(--nb-content)"
                  fillTextColor="#ffffff"
                  radius={4}
                  doneLabel="Album Deleted"
                  disabled={isDeleting}
                  onHold={confirmDeleteAlbum}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  className="flex-1 text-xs font-mono font-bold uppercase cursor-pointer"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  Hold to Delete
                </HoldButton>
              </div>
            </div>
          </div>
        )}

        {/* Delete Individual Photo Modal */}
        {photoToDeleteIdx !== null && selectedAlbum && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
            <div 
              className="bg-[var(--nb-surface)] text-[var(--nb-content)] w-full max-w-sm rounded-lg p-5 text-center space-y-4"
              style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
            >
              {/* Photo Preview */}
              <div 
                className="w-24 h-24 rounded overflow-hidden mx-auto"
                style={{ border: '2px solid var(--nb-ink)' }}
              >
                <img 
                  src={selectedAlbum.images[photoToDeleteIdx]} 
                  alt="Delete preview" 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div>
                <h3 className="nb-headline text-lg">Delete Photo?</h3>
                <p className="text-xs text-[var(--nb-secondary)] mt-1 leading-relaxed font-sans">
                  Remove Photo #{photoToDeleteIdx + 1} from <strong className="text-[var(--nb-content)]">&ldquo;{selectedAlbum.title}&rdquo;</strong>?
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPhotoToDeleteIdx(null)}
                  className="nb-btn-ghost flex-1 text-xs !min-h-[40px] cursor-pointer"
                >
                  Cancel
                </button>
                <HoldButton
                  size="sm"
                  holdTime={1600}
                  backgroundColor="var(--nb-surface-accent)"
                  fillColor="var(--nb-accent)"
                  textColor="var(--nb-content)"
                  fillTextColor="#ffffff"
                  radius={4}
                  doneLabel="Photo Deleted"
                  disabled={isDeleting}
                  onHold={confirmDeletePhoto}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  className="flex-1 text-xs font-mono font-bold uppercase cursor-pointer"
                  style={{ border: '1.5px solid var(--nb-ink)' }}
                >
                  Hold to Delete
                </HoldButton>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}
