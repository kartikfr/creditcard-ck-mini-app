import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, X, User } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import SettingsPageLayout from '@/components/layout/SettingsPageLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import LoginPrompt from '@/components/LoginPrompt';
import { useIsMobile } from '@/hooks/use-mobile';

// Sample reviews data (static for now)
const sampleReviews = [
  {
    id: 1,
    name: 'Tg yadav',
    date: '5 July 2024',
    rating: 5,
    comment: 'this is fab app... lot me it my Awesome experience',
  },
  {
    id: 2,
    name: 'Parhlad kumar Shastri',
    date: '10 July 2023',
    rating: 5,
    comment: 'Extremely satisfied',
  },
  {
    id: 3,
    name: 'Sachin',
    date: '17 July 2024',
    rating: 5,
    comment: 'Love It',
    subComment: 'Good app to get reward and some extra for your purchases below are today s cashback',
  },
  {
    id: 4,
    name: 'sujit',
    date: '14 July 2024',
    rating: 5,
    comment: 'Very good customer support',
    subComment: 'A query was raised from me is the checklist of buyer club so you got its customer support is too the best i m...',
  },
  {
    id: 5,
    name: 'Ankur saha',
    date: '02 Jan 2024',
    rating: 3,
    comment: 'Good but needs improvement',
    subComment: 'Cashback comes ok but, is cashback status needs to improve yodic.',
  },
  {
    id: 6,
    name: 'best one',
    date: '04 Jan 2022',
    rating: 5,
    comment: 'Best app',
  },
  {
    id: 7,
    name: 'Sanjana Patil',
    date: '16 June 2016',
    rating: 5,
    comment: 'Great app',
    subComment: 'Reliable very good app for cashback or given shopping.',
  },
  {
    id: 8,
    name: 'Prashant pawar',
    date: '10 Jan 2024',
    rating: 5,
    comment: 'Best app',
    subComment: 'over all the best also this is a new trick or to make some it is based and has established cashback discovery through CashKaro 3,10 CR+ user',
  },
];

const StarRating: React.FC<{ rating: number; onRate?: (r: number) => void; interactive?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ 
  rating, 
  onRate, 
  interactive = false,
  size = 'sm'
}) => {
  const [hovered, setHovered] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10'
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => onRate?.(star)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hovered || rating)
                ? 'fill-warning text-warning'
                : 'fill-muted text-muted'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
};

const ReviewCard: React.FC<{ review: typeof sampleReviews[0] }> = ({ review }) => (
  <div className="py-4 border-b border-border last:border-b-0">
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="font-medium text-foreground text-sm">{review.comment}</p>
        <StarRating rating={review.rating} size="sm" />
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="w-3 h-3" />
          {review.name}
        </p>
        <p className="text-xs text-muted-foreground">{review.date}</p>
      </div>
    </div>
    {review.subComment && (
      <p className="text-sm text-muted-foreground mt-2">{review.subComment}</p>
    )}
  </div>
);

const ReviewUs: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Use SettingsPageLayout for desktop, AppLayout for mobile
  const Layout = isMobile ? AppLayout : SettingsPageLayout;
  
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      toast({
        title: 'Please write a review',
        description: 'Your feedback helps us improve',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Please rate your experience',
        description: 'Select a star rating',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        message: reviewText.trim(),
        rating: rating,
        category: 'review',
        user_name: user?.firstName || 'Anonymous',
        user_email: user?.email || null,
      });

      if (error) throw error;

      toast({
        title: 'Thank you!',
        description: 'Your review has been submitted',
      });
      setShowWriteReview(false);
      setReviewText('');
      setRating(0);
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast({
        title: 'Failed to submit',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="Review Us"
          description="Login to share your experience with us"
          icon={Star}
        />
      </AppLayout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-4xl lg:max-w-none">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="shrink-0 h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">CashKaro Reviews</h1>
        </div>

        {/* Intro Text */}
        <div className="mb-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lakhs of Indians visit CashKaro every day and make the most of our best offers to get the best deals plus some extra Cashback, right into their bank account. CashKaro reviews from these users show how our deals and offers have held up over the years.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These reviews are filled with appreciation from our users who are ecstatic about getting the best discount coupons and extra Cashback, only through CashKaro.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            CashKaro is the brainchild of Swati and Rohan Bhargava, who launched the platform back in 2011 in the UK, bringing it to Indian customers in 2013. Since its inception, CashKaro has distributed hundreds of crores in Cashback to its customers and has contributed billions of dollars in GMV for online retailers to become the undisputed king of Cashback in India.
          </p>
        </div>

        {/* Write Review Button */}
        <Button
          onClick={() => setShowWriteReview(true)}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl mb-8"
        >
          Write a Review
        </Button>

        {/* Reviews List */}
        <div className="space-y-0">
          {sampleReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* Write Review Modal */}
        <Dialog open={showWriteReview} onOpenChange={setShowWriteReview}>
          <DialogContent className="sm:max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-semibold">Write a Review</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Mobile: Simple layout */}
              <div className="md:hidden space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please tell us how was your experience with us:
                </p>
                <Textarea
                  placeholder="Share your experience..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="min-h-[120px] resize-none border-border"
                  maxLength={500}
                />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Rate your experience</p>
                  <div className="flex justify-center">
                    <StarRating rating={rating} onRate={setRating} interactive size="lg" />
                  </div>
                </div>
              </div>

              {/* Desktop: Centered layout */}
              <div className="hidden md:block space-y-6">
                <Textarea
                  placeholder="Share your experience..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="min-h-[150px] resize-none border-border"
                  maxLength={500}
                />
                <div className="flex justify-center">
                  <StarRating rating={rating} onRate={setRating} interactive size="lg" />
                </div>
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="w-full h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-xl"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ReviewUs;
