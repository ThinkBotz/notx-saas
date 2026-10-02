import React, { useState, useMemo } from 'react';
import { X, Search, RefreshCw, Check, Sparkles } from 'lucide-react';
import { CRAFTWORK_SPECIAL_DATA_URL } from '../lib/craftworkAvatar';

interface AvatarGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (url: string) => void;
  currentUrl: string;
  userSeed: string;
}

// Full DiceBear 9.x Avatar Styles categorized
const AVATAR_STYLES = [
  // Human & Notionists
  { style: 'notionists', name: 'Notionist', category: 'Human' },
  { style: 'lorelei', name: 'Lorelei', category: 'Human' },
  { style: 'open-peeps', name: 'Open Peeps', category: 'Human' },
  { style: 'avataaars', name: 'Avataaars', category: 'Human' },
  { style: 'avataaars-neutral', name: 'Avataaars Neutral', category: 'Human' },
  { style: 'micah', name: 'Micah', category: 'Human' },
  { style: 'personas', name: 'Personas', category: 'Human' },
  { style: 'miniavs', name: 'Miniavs', category: 'Human' },
  { style: 'big-ears', name: 'Big Ears', category: 'Human' },
  { style: 'big-ears-neutral', name: 'Big Ears Neutral', category: 'Human' },
  { style: 'dylan', name: 'Dylan', category: 'Human' },

  // Characters & Fantasy
  { style: 'adventurer', name: 'Adventurer', category: 'Characters' },
  { style: 'adventurer-neutral', name: 'Adventurer Neutral', category: 'Characters' },
  { style: 'croodles', name: 'Croodles', category: 'Characters' },
  { style: 'croodles-neutral', name: 'Croodles Neutral', category: 'Characters' },
  { style: 'toonies', name: 'Toonies', category: 'Characters' },
  { style: 'big-smile', name: 'Big Smile', category: 'Characters' },
  { style: 'fun-emoji', name: 'Fun Emoji', category: 'Characters' },

  // Robots & Sci-Fi
  { style: 'bottts', name: 'Bottts Robot', category: 'Robots' },
  { style: 'bottts-neutral', name: 'Bottts Neutral', category: 'Robots' },

  // Pixel & Retro
  { style: 'pixel-art', name: 'Pixel Art', category: 'Pixel' },
  { style: 'pixel-art-neutral', name: 'Pixel Neutral', category: 'Pixel' },

  // Abstract & Badges
  { style: 'thumbs', name: 'Thumbs', category: 'Abstract' },
  { style: 'identicon', name: 'Identicon', category: 'Abstract' },
  { style: 'initials', name: 'Initials', category: 'Abstract' },
  { style: 'shapes', name: 'Shapes', category: 'Abstract' },
  { style: 'rings', name: 'Rings', category: 'Abstract' },
  { style: 'glass', name: 'Glass', category: 'Abstract' },
  { style: 'spirit', name: 'Spirit', category: 'Abstract' },
];

const SEED_PREFIXES = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet'];

export const AvatarGalleryModal: React.FC<AvatarGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
  currentUrl,
  userSeed
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [seedOffset, setSeedOffset] = useState<number>(1);
  const [customInput, setCustomInput] = useState('');

  // Generate 4 seed variations per style => 30 styles * 4 = 120 avatar models + Craftwork Special = 121 models
  const allAvatars = useMemo(() => {
    const list: Array<{ id: string; name: string; style: string; category: string; url: string }> = [];

    // Always include Special Craftwork vector
    list.push({
      id: 'craftwork-special',
      name: 'Craftwork Special',
      style: 'craftwork',
      category: 'Human',
      url: CRAFTWORK_SPECIAL_DATA_URL
    });

    AVATAR_STYLES.forEach((item) => {
      // Create 4 seed variations per model style
      for (let i = 1; i <= 4; i++) {
        const seedVal = `${userSeed}-${SEED_PREFIXES[(i + seedOffset) % SEED_PREFIXES.length]}-${i}`;
        const avatarUrl = `https://api.dicebear.com/9.x/${item.style}/svg?seed=${seedVal}`;
        list.push({
          id: `${item.style}-${i}-${seedOffset}`,
          name: `${item.name} #${i}`,
          style: item.name,
          category: item.category,
          url: avatarUrl
        });
      }
    });

    return list;
  }, [userSeed, seedOffset]);

  if (!isOpen) return null;

  const categories = ['All', 'Human', 'Characters', 'Robots', 'Pixel', 'Abstract'];

  const filteredAvatars = allAvatars.filter((av) => {
    const matchesCategory = selectedCategory === 'All' || av.category === selectedCategory;
    const matchesSearch = av.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          av.style.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRandomize = () => {
    setSeedOffset((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 animate-fadeIn">
      <div 
        className="bg-[var(--nb-surface)] rounded-lg w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ border: '2px solid var(--nb-ink)', boxShadow: 'var(--shadow-hard)' }}
      >
        
        {/* Header */}
        <div 
          className="p-4 border-b-2 border-[var(--nb-ink)] flex items-center justify-between bg-[var(--nb-surface-accent)] shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded bg-[var(--nb-surface)] flex items-center justify-center text-[var(--nb-accent)]"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="nb-headline text-base text-[var(--nb-content)] flex items-center gap-2">
                Avatar Models Gallery
                <span 
                  className="nb-tag text-[10px] font-mono font-bold"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  {filteredAvatars.length} Models
                </span>
              </h2>
              <p className="nb-label text-[10px] text-[var(--nb-secondary)]">120+ SVG STYLES AND CUSTOM SEED VARIANTS</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRandomize}
              className="nb-btn-ghost flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer"
              style={{ border: '1.5px solid var(--nb-ink)' }}
              title="Shuffle avatar variations"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--nb-accent)]" />
              <span className="hidden sm:inline font-mono">Shuffle</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md bg-[var(--nb-surface)] text-[var(--nb-content)] hover:bg-[var(--nb-surface-accent)] flex items-center justify-center border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div 
          className="p-3 border-b-2 border-[var(--nb-ink)] bg-[var(--nb-surface)] flex flex-col sm:flex-row gap-2.5 items-center justify-between"
        >
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[var(--nb-accent)] text-white'
                    : 'bg-[var(--nb-surface-accent)] text-[var(--nb-content)] hover:bg-[var(--nb-surface)]'
                }`}
                style={{
                  border: '1.5px solid var(--nb-ink)',
                  boxShadow: selectedCategory === cat ? 'var(--shadow-hard-sm)' : 'none'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nb-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search avatar..."
              className="w-full bg-[var(--nb-surface-accent)] rounded pl-8 pr-3 py-1.5 text-xs font-bold text-[var(--nb-content)] outline-none"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            />
          </div>
        </div>

        {/* Avatar Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5 bg-[var(--nb-bg)]">
          {filteredAvatars.map((av) => {
            const isSelected = currentUrl === av.url;
            return (
              <button
                key={av.id}
                onClick={() => {
                  onSelectAvatar(av.url);
                  onClose();
                }}
                className={`group relative flex flex-col items-center p-2 rounded transition-all cursor-pointer bg-[var(--nb-surface)] ${
                  isSelected
                    ? 'bg-[var(--nb-surface-accent)]'
                    : 'hover:bg-[var(--nb-surface-accent)]'
                }`}
                style={{
                  border: isSelected ? '2px solid var(--nb-accent)' : '1.5px solid var(--nb-ink)',
                  boxShadow: isSelected ? 'var(--shadow-hard-sm)' : 'none'
                }}
              >
                <div 
                  className="w-full aspect-square rounded overflow-hidden bg-[var(--nb-surface)] flex items-center justify-center relative"
                  style={{ border: '1px solid var(--nb-ink)' }}
                >
                  <img
                    src={av.url}
                    alt={av.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div 
                      className="absolute top-1 right-1 bg-[var(--nb-accent)] text-white p-0.5 rounded shadow"
                      style={{ border: '1px solid var(--nb-ink)' }}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <span className="nb-label text-[9.5px] text-[var(--nb-content)] mt-1.5 truncate w-full text-center">
                  {av.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer with Custom URL Option */}
        <div 
          className="p-3 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-surface-accent)] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0"
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="nb-label text-[11px] text-[var(--nb-secondary)] whitespace-nowrap">CUSTOM URL:</span>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="https://..."
              className="bg-[var(--nb-surface)] rounded px-2.5 py-1 text-xs font-bold text-[var(--nb-content)] w-full sm:w-72 outline-none"
              style={{ border: '1.5px solid var(--nb-ink)' }}
            />
            {customInput && (
              <button
                onClick={() => {
                  onSelectAvatar(customInput);
                  onClose();
                }}
                className="nb-btn px-3 py-1 rounded text-xs font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                style={{ border: '1.5px solid var(--nb-ink)' }}
              >
                Apply
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto nb-btn-ghost px-4 py-1.5 rounded text-xs font-bold uppercase cursor-pointer"
            style={{ border: '1.5px solid var(--nb-ink)' }}
          >
            Close Gallery
          </button>
        </div>

      </div>
    </div>
  );
};
export default AvatarGalleryModal;
