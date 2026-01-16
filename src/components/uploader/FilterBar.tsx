import { Plus, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterBarProps } from './types';

export const FilterBar = ({
  categories,
  filterCategory,
  setFilterCategory,
  filterLanguage,
  setFilterLanguage,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery,
  onAddRecitation
}: FilterBarProps) => {
  const hasFilters = filterCategory !== 'all' || filterLanguage !== 'all' || searchQuery;
  
  const handleClearFilters = () => {
    setFilterCategory('all');
    setFilterLanguage('all');
    setSearchQuery('');
  };
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl" aria-label="Filter by category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLanguage} onValueChange={setFilterLanguage}>
          <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-xl" aria-label="Filter by language">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="Kashmiri">Kashmiri</SelectItem>
            <SelectItem value="Urdu">Urdu</SelectItem>
            <SelectItem value="Arabic">Arabic</SelectItem>
            <SelectItem value="Persian">Persian</SelectItem>
            <SelectItem value="English">English</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'created_at' | 'title' | 'language')}>
          <SelectTrigger className="w-full sm:w-[120px] h-10 rounded-xl" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="language">Language</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} 
          aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`} 
          className="h-10 px-3 rounded-xl"
        >
          {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
        </Button>

        {hasFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters}
            className="h-10 rounded-xl text-muted-foreground"
          >
            <XIcon className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="flex gap-2 w-full sm:w-auto">
        <Button 
          onClick={onAddRecitation}
          className="flex-1 sm:flex-none h-11 rounded-xl gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Recitation</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </div>
  );
};

