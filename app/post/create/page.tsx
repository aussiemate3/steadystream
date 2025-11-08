'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { compressImage, validateImageFile } from '@/lib/image-compression';

export default function CreatePostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    try {
      setError('');
      setUploading(true);

      const compressedFile = await compressImage(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        quality: 0.85,
      });

      const sizeDiff = ((file.size - compressedFile.size) / file.size * 100).toFixed(0);
      if (sizeDiff !== '0' && parseInt(sizeDiff) > 10) {
        toast({
          description: `Image optimized (${sizeDiff}% smaller)`,
          duration: 2000,
        });
      }

      setImage(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
      setUploading(false);
    } catch (err) {
      console.error('Image compression error:', err);
      setError('Failed to process image. Please try a different image.');
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !image) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      setUploadProgress(25);
      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setUploadProgress(50);
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          throw new Error('Upload conflict. Please try again.');
        }
        throw uploadError;
      }

      setUploadProgress(75);
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      const { data: postData, error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption.trim(),
      }).select('id').single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to save post to database. Please try again.');
      }

      if (postData) {
        logEvent('post_created', { post_id: postData.id });
      }

      setUploadProgress(100);

      toast({
        description: 'Post created successfully!',
        duration: 2000,
      });

      setCaption('');
      setImage(null);
      setImagePreview(null);
      setUploading(false);
      setUploadProgress(0);

      setTimeout(() => {
        router.push('/feed');
      }, 500);
    } catch (err: any) {
      console.error('Post creation error:', err);
      const errorMessage = err.message || 'Failed to create post. Please try again.';
      setError(errorMessage);
      toast({
        description: errorMessage,
        variant: 'destructive',
        duration: 4000,
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      <div className="flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg dark:bg-neutral-900 dark:border-neutral-800">
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Image</Label>
              {imagePreview ? (
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-muted">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors bg-muted">
                  <Upload className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-2" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Click to upload image</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">JPG or PNG, max 5MB</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {uploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  {uploadProgress === 25 && 'Preparing upload...'}
                  {uploadProgress === 50 && 'Uploading image...'}
                  {uploadProgress === 75 && 'Saving post...'}
                  {uploadProgress === 100 && 'Complete!'}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!image || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/feed')}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
