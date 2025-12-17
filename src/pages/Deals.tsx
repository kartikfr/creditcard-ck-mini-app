import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, Search, Grid3X3, List } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCategories } from '@/lib/api';

interface Category {
  id: string;
  type: string;
  attributes: {
    name: string;
    slug?: string;
    unique_identifier?: string;
    hierachy_unique_identifier?: string;
    image_url?: string;
    offer_count?: number;
    description?: string;
  };
  links?: {
    self?: string;
  };
}

const Deals: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetchCategories(1, 1000);
      console.log('[Deals] Categories response:', response);
      
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('[Deals] Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.attributes?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (category: Category) => {
    // Use unique_identifier from attributes, or extract slug from links.self URL
    let slug = category.attributes?.unique_identifier || category.attributes?.slug;
    
    // If no slug found, try to extract from links.self URL
    if (!slug && category.links?.self) {
      const match = category.links.self.match(/\/categories\/([^?]+)/);
      if (match) {
        slug = match[1];
      }
    }
    
    if (slug) {
      navigate(`/category/${slug}`);
    } else {
      console.error('[Deals] No slug found for category:', category);
    }
  };

  const LoadingSkeleton = () => (
    <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
      {Array.from({ length: 12 }).map((_, i) => (
        viewMode === 'grid' ? (
          <div key={i} className="card-elevated p-4">
            <Skeleton className="w-16 h-16 rounded-xl mx-auto mb-3" />
            <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-3 w-1/2 mx-auto" />
          </div>
        ) : (
          <div key={i} className="card-elevated p-4 flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="w-5 h-5" />
          </div>
        )
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
            Deals & Categories
          </h1>
          <p className="text-muted-foreground">Browse all categories and find the best deals</p>
        </header>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-11 w-11"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-11 w-11"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Categories Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredCategories.length} categories found
          </p>
        )}

        {/* Categories */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredCategories.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No categories found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="card-elevated p-4 text-center hover:border-primary transition-all duration-200 group"
              >
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  {category.attributes?.image_url ? (
                    <img
                      src={category.attributes.image_url}
                      alt={category.attributes.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl">${category.attributes?.name?.charAt(0) || 'C'}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {category.attributes?.name?.charAt(0) || 'C'}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-foreground text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {category.attributes?.name}
                </p>
                {category.attributes?.offer_count !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {category.attributes.offer_count} offers
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="card-elevated p-4 w-full flex items-center gap-4 text-left hover:border-primary transition-all duration-200 group"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {category.attributes?.image_url ? (
                    <img
                      src={category.attributes.image_url}
                      alt={category.attributes.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-xl font-bold text-primary">${category.attributes?.name?.charAt(0) || 'C'}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-xl font-bold text-primary">
                      {category.attributes?.name?.charAt(0) || 'C'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {category.attributes?.name}
                  </p>
                  {category.attributes?.offer_count !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {category.attributes.offer_count} offers available
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Deals;
