import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { AnnotatedMeme } from "@/types/models";
import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AnnotateMemeProps {
  memes: AnnotatedMeme[];
  selectedMeme: AnnotatedMeme;
  setSelectedMeme: (meme: AnnotatedMeme) => void;
  updateMeme: (meme: AnnotatedMeme) => void;
}

export function AnnotateMeme({
  memes,
  selectedMeme,
  setSelectedMeme,
  updateMeme,
}: AnnotateMemeProps) {
  console.log("Selected Meme:", selectedMeme);
  const api_url = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  const currentIndex = memes.findIndex((meme) => meme.id === selectedMeme.id);
  const nextIndex = (currentIndex + 1) % memes.length;
  const prevIndex = (currentIndex - 1 + memes.length) % memes.length;
  const [isAnnotating, setIsAnnotating] = useState(false);

  const [context, setContext] = useState(selectedMeme.context || "");
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [isUpdatingContext, setIsUpdatingContext] = useState(false);

  const [ocrText, setOcrText] = useState(selectedMeme.ocr_text || "");
  const [explanation, setExplanation] = useState(
    selectedMeme.explanation || ""
  );

  useEffect(() => {
    setOcrText(selectedMeme.ocr_text || "");
    setExplanation(selectedMeme.explanation || "");
    setContext(selectedMeme.context || "");
  }, [selectedMeme]);

  const handleUpdateOCR = async () => {
    if (!selectedMeme) return;

    try {
      const response = await fetch("/api/memes/update-ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memeId: selectedMeme.id,
          ocrText: ocrText,
        }),
      });

      if (response.ok) {
        const updatedMeme = { ...selectedMeme, ocr_text: ocrText };
        updateMeme(updatedMeme);
        console.log("OCR text updated successfully");
      } else {
        console.error("Failed to update OCR text");
      }
    } catch (error) {
      console.error("Error updating OCR text:", error);
    }
  };

  async function handleUpdateExplanation() {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("annotated_memes")
        .update({ explanation: explanation })
        .eq("id", selectedMeme.id);

      if (error) {
        toast.error("Failed to update explanation");
        console.error("Error updating explanation:", error);
        return;
      }
      toast.success("Explanation updated successfully");
    } catch (error) {
      toast.error("Failed to update explanation");
      console.error("Error updating explanation:", error);
    }
  }

  async function handleGenerateAnnotation() {
    if (!api_url) {
      toast.error("API URL is not defined in environment variables");
      return;
    }
    if (!selectedMeme.uploaded_meme_url) {
      toast.error("Selected meme is missing URL for annotation generation");
      return;
    }
    try {
      setIsAnnotating(true);
      const response = await fetch(`${api_url}/annotation/annotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meme_id: selectedMeme.id,
          meme_url: selectedMeme.uploaded_meme_url,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to generate annotation: ${errorData.message}`);
        console.error("Error generating annotation:", errorData);
        return;
      }
      const data = await response.json();
      const updatedMeme = {
        ...selectedMeme,
        annotation_status: data.annotation_status || "half_annotated",
        heroes: data.heroes || [],
        villains: data.villains || [],
        victims: data.victims || [],
        other_roles: data.other_roles || [],
        sentiment: data.sentiment || "",
        explanation: data.explanation || "",
        genre: data.genre || "",
      };
      toast.success("Annotation generated successfully");
      updateMeme(updatedMeme);
      router.refresh();
    } catch (error) {
      toast.error("Failed to generate annotation");
      console.error("Error generating annotation:", error);
    } finally {
      setIsAnnotating(false);
    }
  }

  async function handleGenerateContext() {
    if (!api_url) {
      toast.error("API URL is not defined in environment variables");
      return;
    }
    if (!selectedMeme.uploaded_meme_url) {
      toast.error("Selected meme is missing URL for context generation");
      return;
    }
    try {
      setIsGeneratingContext(true);
      const response = await fetch(`${api_url}/annotation/generate-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meme_id: selectedMeme.id,
          meme_url: selectedMeme.uploaded_meme_url,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to generate context: ${errorData.message}`);
        console.error("Error generating context:", errorData);
        return;
      }
      const data = await response.json();
      toast.success("Context generated successfully");
      updateMeme({
        ...selectedMeme,
        context: data.context || "",
        annotation_status: "fully_annotated",
      });
      setTimeout(() => {
        router.refresh();
      }, 500); // Delay to ensure UI updates
    } catch (error) {
      toast.error("Failed to generate context");
      console.error("Error generating context:", error);
    } finally {
      setIsGeneratingContext(false);
    }
  }

  const handleUpdateContext = async () => {
    if (!selectedMeme) return;
    setIsUpdatingContext(true);

    try {
      const response = await fetch("/api/memes/update-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memeId: selectedMeme.id,
          context: context,
        }),
      });

      if (response.ok) {
        const updatedMeme = { ...selectedMeme, context: context };
        updateMeme(updatedMeme);

        console.log("Context updated successfully");
      } else {
        console.error("Failed to update context");
      }
    } catch (error) {
      console.error("Error updating context:", error);
    } finally {
      setIsUpdatingContext(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          className="cursor-pointer"
          variant="ghost"
          onClick={() => setSelectedMeme(memes[prevIndex])}
        >
          <ArrowLeftCircle className="size-6" />
        </Button>
        <h1 className="font-mono font-semibold">Annotate Individual Meme</h1>
        <Button
          className="cursor-pointer"
          variant="ghost"
          onClick={() => setSelectedMeme(memes[nextIndex])}
        >
          <ArrowRightCircle className="size-6" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto p-4">
        {/* edit_ocr_text */}
        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground" htmlFor="ocr-text">
            Edit OCR Text
          </Label>
          <div className="flex justify-between items-start gap-2">
            <Textarea
              className="resize-none h-36"
              placeholder="Edit OCR text..."
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
            />
            <Button
              className="cursor-pointer"
              onClick={handleUpdateOCR}
              variant="secondary"
            >
              Update
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <p className="text-sm font-semibold text-center">
          {selectedMeme.annotation_status === "half_annotated"
            ? "This meme is half annotated. Needs to generate context."
            : "This meme is fully annotated. You can edit if needed."}
        </p>

        {/* edit other fields except retrieving and editing Context */}
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Meme Explanation</Label>
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-2 w-2/3">
              <Textarea
                className="resize-none h-36"
                placeholder="Edit explanation..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
              />
              <Button
                className="cursor-pointer"
                onClick={handleUpdateExplanation}
                variant="secondary"
              >
                Update
              </Button>
            </div>

            <div className="flex flex-col gap-2 w-1/3">
              <div className="flex flex-col gap-2">
                <Label>Genre</Label>
                <Input value={selectedMeme.genre || "No genre selected"} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Sentiment</Label>
                <Input
                  value={selectedMeme.sentiment || "No sentiment available"}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Roles</Label>
            <div>
              <div className="flex gap-1 items-start flex-wrap">
                <Badge className="font-mono font-semibold">Hero</Badge>
                {selectedMeme.heroes && selectedMeme.heroes.length > 0 ? (
                  <div>
                    {selectedMeme.heroes.map((hero) => (
                      <Badge variant="outline" key={hero}>
                        {hero}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p>No heroes assigned</p>
                )}
              </div>
            </div>
            <div>
              <div className="flex gap-1 items-start flex-wrap">
                <Badge className="font-mono font-semibold">Villain</Badge>
                {selectedMeme.villains && selectedMeme.villains.length > 0 ? (
                  <div>
                    {selectedMeme.villains.map((villain) => (
                      <Badge variant="outline" key={villain}>
                        {villain}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p>No villains assigned</p>
                )}
              </div>
            </div>
            <div>
              <div className="flex gap-1 items-start flex-wrap">
                <Badge className="font-mono font-semibold">Victim</Badge>
                {selectedMeme.victims && selectedMeme.victims.length > 0 ? (
                  <div>
                    {selectedMeme.victims.map((victim) => (
                      <Badge variant="outline" key={victim}>
                        {victim}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p>No victims assigned</p>
                )}
              </div>
            </div>
            <div>
              <div className="flex gap-1 items-start flex-wrap">
                <Badge className="font-mono font-semibold">Other Roles</Badge>
                {selectedMeme.other_roles &&
                selectedMeme.other_roles.length > 0 ? (
                  <div>
                    {selectedMeme.other_roles.map((role) => (
                      <Badge variant="outline" key={role}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p>No other roles assigned</p>
                )}
              </div>
            </div>
          </div>

          <Button
            className="w-full cursor-pointer"
            disabled={
              selectedMeme.annotation_status === "half_annotated" ||
              isAnnotating ||
              selectedMeme.annotation_status === "fully_annotated"
            }
            onClick={handleGenerateAnnotation}
          >
            {isAnnotating ? "Generating Annotation..." : "Generate Annotation"}
          </Button>
        </div>

        <Separator className="my-4" />

        {/* context generation */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Context</Label>

            <div className="flex justify-between items-start gap-2">
              <Textarea
                className="resize-none h-36"
                placeholder="Context will be generated here..."
                value={context}
                disabled={selectedMeme.annotation_status !== "fully_annotated"}
                onChange={(e) => setContext(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={isUpdatingContext}
                onClick={handleUpdateContext}
                className="cursor-pointer ring-1"
              >
                {isUpdatingContext ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
          <Button
            className="w-full mt-2 cursor-pointer"
            disabled={isGeneratingContext}
            onClick={handleGenerateContext}
          >
            {isGeneratingContext ? "Generating Context..." : "Generate Context"}
          </Button>
        </div>
      </div>
    </div>
  );
}
