import React, { useState, useRef } from 'react';
import { Loader2, ChevronRight, ArrowLeft, CheckCircle, Upload, X, HelpCircle, FileText, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { raiseTicket } from '@/lib/api';

interface AnswerContent {
  subtitle?: string;
  description?: string;
}

interface AnswerSection {
  image?: string;
  appimage?: string;
  title?: string;
  content?: AnswerContent[];
}

interface Configuration {
  id: number;
  type: string;
  attributes: {
    create_ticket?: string;
    question?: string;
    answer?: {
      section?: AnswerSection;
    } | null;
    type?: string;
    sub_type?: string;
    attachment_required?: string;
    button_text?: string;
    action_url?: string;
    app_action_url?: string;
  };
}

interface RaiseQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  orderContext: {
    exitClickDate: string;
    storeId: string;
    exitId: string;
    storeName: string;
    orderId?: string;
    orderAmount?: string;
    cashbackId?: string;
  };
  configurations?: Configuration[];
}

interface FileAttachment {
  file: File;
  preview: string;
  base64: string;
}

const MAX_FILES = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf'];

const RaiseQueryModal: React.FC<RaiseQueryModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  orderContext,
  configurations = [],
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'questions' | 'form' | 'answer' | 'success'>('questions');
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [transactionId, setTransactionId] = useState(orderContext.orderId || '');
  const [totalAmount, setTotalAmount] = useState(orderContext.orderAmount || '');
  const [couponCode, setCouponCode] = useState('');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!transactionId.trim()) {
      newErrors.transactionId = 'Order/Transaction ID is required';
    } else if (transactionId.length > 25) {
      newErrors.transactionId = 'Order ID must be 25 characters or less';
    } else if (!/^[a-zA-Z0-9#\-./]+$/.test(transactionId)) {
      newErrors.transactionId = 'Only alphanumeric and #, -, ., / allowed';
    }
    
    if (!totalAmount.trim()) {
      newErrors.totalAmount = 'Amount is required';
    } else {
      const amount = parseFloat(totalAmount);
      if (isNaN(amount) || amount < 1 || amount > 999999999) {
        newErrors.totalAmount = 'Amount must be between 1 and 999999999';
      }
    }
    
    if (couponCode && couponCode.length > 15) {
      newErrors.couponCode = 'Coupon code must be 15 characters or less';
    } else if (couponCode && !/^[a-zA-Z0-9]*$/.test(couponCode)) {
      newErrors.couponCode = 'Only alphanumeric characters allowed';
    }
    
    if (transactionDetails && transactionDetails.length > 750) {
      newErrors.transactionDetails = 'Details must be 750 characters or less';
    }

    // Check if attachment is required
    if (selectedConfig?.attributes?.attachment_required === 'yes' && attachments.length === 0) {
      newErrors.attachments = 'At least one attachment is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: FileAttachment[] = [];
    
    for (const file of Array.from(files)) {
      if (attachments.length + newAttachments.length >= MAX_FILES) {
        toast({
          title: 'File limit reached',
          description: `Maximum ${MAX_FILES} files allowed`,
          variant: 'destructive',
        });
        break;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Only JPEG, PNG, GIF, and PDF files are allowed',
          variant: 'destructive',
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 2MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      // Convert to base64
      const base64 = await fileToBase64(file);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      
      newAttachments.push({ file, preview, base64 });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleQuestionSelect = (config: Configuration) => {
    setSelectedConfig(config);
    
    // Route based on create_ticket value
    if (config.attributes.create_ticket === 'yes') {
      setStep('form');
    } else {
      // Show static answer
      setStep('answer');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const fileData = attachments.map((att, idx) => ({
        name: `attachment${idx + 1}`,
        data: att.base64,
        filename: att.file.name,
        contentType: att.file.type,
      }));

      await raiseTicket(
        accessToken,
        orderContext.exitClickDate,
        orderContext.storeId,
        orderContext.exitId,
        {
          transaction_id: transactionId,
          total_amount_paid: parseFloat(totalAmount),
          coupon_code_used: couponCode || undefined,
          transaction_details: transactionDetails || undefined,
          query_type: selectedConfig?.attributes?.type,
          query_sub_type: selectedConfig?.attributes?.sub_type,
          cashback_id: orderContext.cashbackId ? parseInt(orderContext.cashbackId) : undefined,
        },
        fileData
      );
      
      setStep('success');
      toast({
        title: 'Query Submitted',
        description: 'Your query has been submitted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit query. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('questions');
    setSelectedConfig(null);
    setTransactionId(orderContext.orderId || '');
    setTotalAmount(orderContext.orderAmount || '');
    setCouponCode('');
    setTransactionDetails('');
    setAttachments([]);
    setErrors({});
    onClose();
  };

  const handleBack = () => {
    if (step === 'form' || step === 'answer') {
      setStep('questions');
      setSelectedConfig(null);
    }
  };

  const handleAnswerAction = () => {
    const actionUrl = selectedConfig?.attributes?.action_url;
    const appActionUrl = selectedConfig?.attributes?.app_action_url;
    
    if (actionUrl) {
      window.open(actionUrl, '_blank');
    } else if (appActionUrl) {
      // For app_action_url, check if it contains order details path
      if (appActionUrl.includes('order-details')) {
        // Close modal and stay on current page
        handleClose();
      } else {
        window.open(appActionUrl, '_blank');
      }
    } else {
      // No URL, just close modal
      handleClose();
    }
  };

  // Get all configurations with questions (both ticket and non-ticket)
  const allConfigs = configurations.filter(config => config.attributes?.question);

  const getDialogTitle = () => {
    switch (step) {
      case 'questions':
        return 'Raise a Query';
      case 'form':
        return 'Submit Details';
      case 'answer':
        return selectedConfig?.attributes?.answer?.section?.title || 'Information';
      case 'success':
        return 'Query Submitted';
      default:
        return 'Raise a Query';
    }
  };

  // Check if attachments should be shown
  const showAttachments = selectedConfig?.attributes?.attachment_required === 'yes';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(step === 'form' || step === 'answer') && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 -ml-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        {step === 'questions' ? (
          <div className="space-y-4">
            {/* Store Context */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Raising query for <span className="font-medium text-foreground">{orderContext.storeName}</span>
              </p>
            </div>

            {/* Question Icon */}
            <div className="flex justify-center py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* What is your query about? */}
            <h3 className="text-center font-semibold text-foreground">
              What is your query about?
            </h3>

            {/* Dashed separator */}
            <div className="border-t-2 border-dashed border-muted my-4" />

            {/* Question List - Show ALL configurations */}
            {allConfigs.length > 0 ? (
              <div className="space-y-2">
                {allConfigs.map((config) => (
                  <button
                    key={config.id}
                    onClick={() => handleQuestionSelect(config)}
                    className="w-full flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="text-sm text-foreground pr-2">
                      {config.attributes.question}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">
                No query options available for this order.
              </p>
            )}
          </div>
        ) : step === 'answer' ? (
          // Static Answer Step
          <div className="space-y-4">
            {selectedConfig?.attributes?.answer?.section && (
              <>
                {/* Image */}
                {selectedConfig.attributes.answer.section.image && (
                  <div className="flex justify-center py-4">
                    <img 
                      src={selectedConfig.attributes.answer.section.image} 
                      alt="Info" 
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                )}

                {/* Title */}
                {selectedConfig.attributes.answer.section.title && (
                  <h3 className="text-center text-lg font-semibold text-foreground">
                    {selectedConfig.attributes.answer.section.title}
                  </h3>
                )}

                {/* Dashed separator */}
                <div className="border-t-2 border-dashed border-muted my-4" />

                {/* Content */}
                {selectedConfig.attributes.answer.section.content && (
                  <div className="space-y-4">
                    {selectedConfig.attributes.answer.section.content.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        {item.subtitle && (
                          <h4 className="font-medium text-foreground">{item.subtitle}</h4>
                        )}
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Action Button */}
            <Button
              onClick={handleAnswerAction}
              className="w-full mt-4"
            >
              {selectedConfig?.attributes?.button_text || 'Okay'}
              {(selectedConfig?.attributes?.action_url || 
                (selectedConfig?.attributes?.app_action_url && !selectedConfig.attributes.app_action_url.includes('order-details'))) && (
                <ExternalLink className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        ) : step === 'form' ? (
          <div className="space-y-4">
            {/* Selected Question - Without type/sub_type */}
            {selectedConfig && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">
                  {selectedConfig.attributes.question}
                </p>
              </div>
            )}

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transactionId">Order/Transaction ID *</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter your order ID"
                maxLength={25}
                className={errors.transactionId ? 'border-destructive' : ''}
              />
              {errors.transactionId && (
                <p className="text-xs text-destructive">{errors.transactionId}</p>
              )}
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount Paid *</Label>
              <Input
                id="totalAmount"
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="Enter order amount"
                min={1}
                max={999999999}
                className={errors.totalAmount ? 'border-destructive' : ''}
              />
              {errors.totalAmount && (
                <p className="text-xs text-destructive">{errors.totalAmount}</p>
              )}
            </div>

            {/* Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="couponCode">Coupon Code (Optional)</Label>
              <Input
                id="couponCode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="If used any coupon"
                maxLength={15}
                className={errors.couponCode ? 'border-destructive' : ''}
              />
              {errors.couponCode && (
                <p className="text-xs text-destructive">{errors.couponCode}</p>
              )}
            </div>

            {/* Transaction Details */}
            <div className="space-y-2">
              <Label htmlFor="transactionDetails">Additional Details (Optional)</Label>
              <Textarea
                id="transactionDetails"
                value={transactionDetails}
                onChange={(e) => setTransactionDetails(e.target.value)}
                placeholder="Any additional information about your transaction"
                maxLength={750}
                rows={3}
                className={errors.transactionDetails ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground text-right">
                {transactionDetails.length}/750
              </p>
              {errors.transactionDetails && (
                <p className="text-xs text-destructive">{errors.transactionDetails}</p>
              )}
            </div>

            {/* File Attachments - Only show when attachment_required is "yes" */}
            {showAttachments && (
              <div className="space-y-2">
                <Label>Attachments *</Label>
                <p className="text-xs text-muted-foreground">
                  Max {MAX_FILES} files, 2MB each (JPEG, PNG, GIF, PDF)
                </p>
                
                {/* File Preview Grid */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 my-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative group">
                        {att.preview ? (
                          <img
                            src={att.preview}
                            alt={att.file.name}
                            className="w-full h-20 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-full h-20 bg-muted rounded-lg border flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-muted-foreground truncate mt-1">{att.file.name}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {attachments.length < MAX_FILES && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Add Attachment ({attachments.length}/{MAX_FILES})
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {errors.attachments && (
                  <p className="text-xs text-destructive">{errors.attachments}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Query'
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Query Submitted Successfully!
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              We've received your query and will get back to you soon. You can track the status in "Your Queries" section.
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RaiseQueryModal;
