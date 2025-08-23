"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Schedule {
  brandContext?: string;
  targetAudience?: string;
  contentStyle?: string;
}

interface ContentGenerationTabProps {
  schedule: Schedule;
  onGenerateContent: (prompt: string) => Promise<void>;
}

export function ContentGenerationTab({
  schedule,
  onGenerateContent,
}: ContentGenerationTabProps) {
  const [contentPrompt, setContentPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateContent = async () => {
    if (!contentPrompt.trim()) {
      toast.error("Please provide a content prompt");
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateContent(contentPrompt);
      setContentPrompt("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Generate engaging content for your social media posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brand Context Display */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium mb-2">Brand Context (from Settings)</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {schedule.brandContext}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              <strong>Target Audience:</strong> {schedule.targetAudience}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Content Style:</strong> {schedule.contentStyle}
            </p>
          </div>

          {/* Content Prompt */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content-prompt">Content Prompt</Label>
              <Textarea
                id="content-prompt"
                value={contentPrompt}
                onChange={(e) => setContentPrompt(e.target.value)}
                placeholder="Describe what kind of content you want to generate. For example: 'Create posts about our new AI feature launch, highlighting benefits for small businesses...'"
                rows={4}
              />
            </div>
            <Button
              onClick={handleGenerateContent}
              disabled={isGenerating || !contentPrompt.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                <span className="font-medium">
                  AI is generating your content...
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This may take a few moments. We're analyzing your brand context
                and creating personalized content.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
