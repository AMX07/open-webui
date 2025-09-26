import './CategoryChips.css';

interface CategoryChipsProps {
  categories: string[];
  activeCategory: string;
  onSelect(category: string): void;
}

export default function CategoryChips({ categories, activeCategory, onSelect }: CategoryChipsProps) {
  return (
    <div className="chips">
      {categories.map((category) => (
        <button
          key={category}
          className={`chip ${activeCategory === category ? 'chip--active' : ''}`}
          onClick={() => onSelect(category)}
          type="button"
        >
          {category}
        </button>
      ))}
    </div>
  );
}
