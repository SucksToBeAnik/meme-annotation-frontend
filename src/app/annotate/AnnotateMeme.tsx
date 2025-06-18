import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { AnnotatedMeme } from "@/types/models";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  Check,
  XCircle,
} from "lucide-react";
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
  const [isBatchAnnotating, setIsBatchAnnotating] = useState(false);
  const [isBatchGeneratingContext, setIsBatchGeneratingContext] =
    useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const [context, setContext] = useState(selectedMeme.context || "");
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [isUpdatingContext, setIsUpdatingContext] = useState(false);

  const [ocrText, setOcrText] = useState(selectedMeme.ocr_text || "");
  const [explanation, setExplanation] = useState(
    selectedMeme.explanation || ""
  );
  const [hero, setHero] = useState("");
  const [villain, setVillain] = useState("");
  const [victim, setVictim] = useState("");
  const [otherRole, setOtherRole] = useState("");

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

  // Batch processing functions
  async function handleAnnotateAll() {
    if (!api_url) {
      toast.error("API URL is not defined in environment variables");
      return;
    }

    const uploadedMemes = memes.filter(
      (meme) => meme.annotation_status === "uploaded"
    );
    if (uploadedMemes.length === 0) {
      toast.info("No memes with 'uploaded' status found to annotate");
      return;
    }

    setIsBatchAnnotating(true);
    setBatchProgress({ current: 0, total: uploadedMemes.length });

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < uploadedMemes.length; i++) {
      const meme = uploadedMemes[i];
      setBatchProgress({ current: i + 1, total: uploadedMemes.length });

      if (!meme.uploaded_meme_url) {
        console.warn(`Skipping meme ${meme.id}: missing URL`);
        failureCount++;
        continue;
      }

      try {
        const response = await fetch(`${api_url}/annotation/annotate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meme_id: meme.id,
            meme_url: meme.uploaded_meme_url,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Failed to annotate meme ${meme.id}:`, errorData);
          failureCount++;
          continue;
        }

        const data = await response.json();
        const updatedMeme = {
          ...meme,
          annotation_status: data.annotation_status || "half_annotated",
          heroes: data.heroes || [],
          villains: data.villains || [],
          victims: data.victims || [],
          other_roles: data.other_roles || [],
          sentiment: data.sentiment || "",
          explanation: data.explanation || "",
          genre: data.genre || "",
        };

        updateMeme(updatedMeme);
        successCount++;
      } catch (error) {
        console.error(`Error annotating meme ${meme.id}:`, error);
        failureCount++;
      }
    }

    setIsBatchAnnotating(false);
    setBatchProgress({ current: 0, total: 0 });

    toast.success(
      `Batch annotation completed: ${successCount} successful, ${failureCount} failed`
    );
    router.refresh();
  }

  async function handleGenerateContextForAll() {
    if (!api_url) {
      toast.error("API URL is not defined in environment variables");
      return;
    }

    const halfAnnotatedMemes = memes.filter(
      (meme) => meme.annotation_status === "half_annotated"
    );
    if (halfAnnotatedMemes.length === 0) {
      toast.info(
        "No memes with 'half_annotated' status found to generate context for"
      );
      return;
    }

    setIsBatchGeneratingContext(true);
    setBatchProgress({ current: 0, total: halfAnnotatedMemes.length });

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < halfAnnotatedMemes.length; i++) {
      const meme = halfAnnotatedMemes[i];
      setBatchProgress({ current: i + 1, total: halfAnnotatedMemes.length });

      if (!meme.uploaded_meme_url) {
        console.warn(`Skipping meme ${meme.id}: missing URL`);
        failureCount++;
        continue;
      }

      try {
        const response = await fetch(`${api_url}/annotation/generate-context`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meme_id: meme.id,
            meme_url: meme.uploaded_meme_url,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            `Failed to generate context for meme ${meme.id}:`,
            errorData
          );
          failureCount++;
          continue;
        }

        const data = await response.json();
        const updatedMeme = {
          ...meme,
          context: data.context || "",
          annotation_status: "fully_annotated",
        };

        updateMeme(updatedMeme);
        successCount++;
      } catch (error) {
        console.error(`Error generating context for meme ${meme.id}:`, error);
        failureCount++;
      }
    }

    setIsBatchGeneratingContext(false);
    setBatchProgress({ current: 0, total: 0 });

    toast.success(
      `Batch context generation completed: ${successCount} successful, ${failureCount} failed`
    );
    router.refresh();
  }

  // Hero functions
  async function handleAddHero() {
    if (!hero.trim()) {
      toast.error("Hero name cannot be empty");
      return;
    }
    if (!selectedMeme) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("annotated_memes")
        .update({
          heroes: [...(selectedMeme.heroes || []), hero],
        })
        .eq("id", selectedMeme.id);

      if (error) {
        toast.error("Failed to add hero");
        console.error("Error adding hero:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        heroes: [...(selectedMeme.heroes || []), hero],
      };
      updateMeme(updatedMeme);
      setHero("");
      toast.success("Hero added successfully");
    } catch (error) {
      toast.error("Failed to add hero");
      console.error("Error adding hero:", error);
      setHero("");
    }
  }

  async function handleRemoveHero(heroToRemove: string) {
    console.log("Removing hero:", heroToRemove);
    if (!selectedMeme || !selectedMeme.heroes) return;
    try {
      const supabase = createClient();
      const updatedHeroes = selectedMeme.heroes.filter(
        (hero) => hero !== heroToRemove
      );
      const { error } = await supabase.from("annotated_memes").update({
        heroes: updatedHeroes,
      }).eq("id", selectedMeme.id);
      if (error) {
        toast.error("Failed to remove hero");
        console.error("Error removing hero:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        heroes: updatedHeroes,
      };
      updateMeme(updatedMeme);
      toast.success("Hero removed successfully");
    } catch (error) {
      toast.error("Failed to remove hero");
      console.error("Error removing hero:", error);
    }
  }

  // Villain functions
  async function handleAddVillain() {
    if (!villain.trim()) {
      toast.error("Villain name cannot be empty");
      return;
    }
    if (!selectedMeme) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("annotated_memes")
        .update({
          villains: [...(selectedMeme.villains || []), villain],
        })
        .eq("id", selectedMeme.id);

      if (error) {
        toast.error("Failed to add villain");
        console.error("Error adding villain:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        villains: [...(selectedMeme.villains || []), villain],
      };
      updateMeme(updatedMeme);
      setVillain("");
      toast.success("Villain added successfully");
    } catch (error) {
      toast.error("Failed to add villain");
      console.error("Error adding villain:", error);
      setVillain("");
    }
  }

  async function handleRemoveVillain(villainToRemove: string) {
    console.log("Removing villain:", villainToRemove);
    if (!selectedMeme || !selectedMeme.villains) return;
    try {
      const supabase = createClient();
      const updatedVillains = selectedMeme.villains.filter(
        (villain) => villain !== villainToRemove
      );
      const { error } = await supabase.from("annotated_memes").update({
        villains: updatedVillains,
      }).eq("id", selectedMeme.id);
      if (error) {
        toast.error("Failed to remove villain");
        console.error("Error removing villain:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        villains: updatedVillains,
      };
      updateMeme(updatedMeme);
      toast.success("Villain removed successfully");
    } catch (error) {
      toast.error("Failed to remove villain");
      console.error("Error removing villain:", error);
    }
  }

  // Victim functions
  async function handleAddVictim() {
    if (!victim.trim()) {
      toast.error("Victim name cannot be empty");
      return;
    }
    if (!selectedMeme) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("annotated_memes")
        .update({
          victims: [...(selectedMeme.victims || []), victim],
        })
        .eq("id", selectedMeme.id);

      if (error) {
        toast.error("Failed to add victim");
        console.error("Error adding victim:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        victims: [...(selectedMeme.victims || []), victim],
      };
      updateMeme(updatedMeme);
      setVictim("");
      toast.success("Victim added successfully");
    } catch (error) {
      toast.error("Failed to add victim");
      console.error("Error adding victim:", error);
      setVictim("");
    }
  }

  async function handleRemoveVictim(victimToRemove: string) {
    console.log("Removing victim:", victimToRemove);
    if (!selectedMeme || !selectedMeme.victims) return;
    try {
      const supabase = createClient();
      const updatedVictims = selectedMeme.victims.filter(
        (victim) => victim !== victimToRemove
      );
      const { error } = await supabase.from("annotated_memes").update({
        victims: updatedVictims,
      }).eq("id", selectedMeme.id);
      if (error) {
        toast.error("Failed to remove victim");
        console.error("Error removing victim:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        victims: updatedVictims,
      };
      updateMeme(updatedMeme);
      toast.success("Victim removed successfully");
    } catch (error) {
      toast.error("Failed to remove victim");
      console.error("Error removing victim:", error);
    }
  }

  // Other Role functions
  async function handleAddOtherRole() {
    if (!otherRole.trim()) {
      toast.error("Role name cannot be empty");
      return;
    }
    if (!selectedMeme) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("annotated_memes")
        .update({
          other_roles: [...(selectedMeme.other_roles || []), otherRole],
        })
        .eq("id", selectedMeme.id);

      if (error) {
        toast.error("Failed to add other role");
        console.error("Error adding other role:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        other_roles: [...(selectedMeme.other_roles || []), otherRole],
      };
      updateMeme(updatedMeme);
      setOtherRole("");
      toast.success("Other role added successfully");
    } catch (error) {
      toast.error("Failed to add other role");
      console.error("Error adding other role:", error);
      setOtherRole("");
    }
  }

  async function handleRemoveOtherRole(roleToRemove: string) {
    console.log("Removing other role:", roleToRemove);
    if (!selectedMeme || !selectedMeme.other_roles) return;
    try {
      const supabase = createClient();
      const updatedOtherRoles = selectedMeme.other_roles.filter(
        (role) => role !== roleToRemove
      );
      const { error } = await supabase.from("annotated_memes").update({
        other_roles: updatedOtherRoles,
      }).eq("id", selectedMeme.id);
      if (error) {
        toast.error("Failed to remove other role");
        console.error("Error removing other role:", error);
        return;
      }
      const updatedMeme = {
        ...selectedMeme,
        other_roles: updatedOtherRoles,
      };
      updateMeme(updatedMeme);
      toast.success("Other role removed successfully");
    } catch (error) {
      toast.error("Failed to remove other role");
      console.error("Error removing other role:", error);
    }
  }

  return (
    <div className="space-y-4 h-[87vh] overflow-y-auto shadow-2xl rounded-md">
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

      {/* Batch Processing Section */}
      <div className="flex flex-col gap-4 mb-6 p-4 m-4 border rounded-lg bg-muted/10">
        <h2 className="font-semibold text-lg">Batch Processing</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            className="cursor-pointer"
            disabled={isBatchAnnotating || isBatchGeneratingContext}
            onClick={handleAnnotateAll}
            variant="outline"
          >
            {isBatchAnnotating
              ? `Annotating... (${batchProgress.current}/${batchProgress.total})`
              : `Annotate All (${
                  memes.filter((m) => m.annotation_status === "uploaded").length
                } memes)`}
          </Button>
          <Button
            className="cursor-pointer"
            disabled={isBatchAnnotating || isBatchGeneratingContext}
            onClick={handleGenerateContextForAll}
            variant="outline"
          >
            {isBatchGeneratingContext
              ? `Generating Context... (${batchProgress.current}/${batchProgress.total})`
              : `Get Context for All (${
                  memes.filter((m) => m.annotation_status === "half_annotated")
                    .length
                } memes)`}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Batch operations will automatically process all eligible memes. Failed
          operations will be skipped and logged.
        </p>
      </div>

      {/* <Separator className="my-4" /> */}

      <div className="flex flex-col gap-4 p-4">
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
            
            {/* Hero Section */}
            <div>
              <div className="flex gap-1 items-center flex-wrap">
                <Badge className="font-mono font-semibold">Hero</Badge>
                {selectedMeme.heroes && selectedMeme.heroes.length > 0 ? (
                  <>
                    {selectedMeme.heroes.map((heroItem, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-1 py-[1px] rounded-3xl border border-gray-300">
                        <span className="text-sm">{heroItem}</span>
                        <XCircle
                          className="cursor-pointer text-red-500 size-3"
                          onClick={() => handleRemoveHero(heroItem)}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <Badge variant="outline">No heroes assigned</Badge>
                )}
                <Input
                  value={hero}
                  onChange={(e) => setHero(e.target.value)}
                  className="inline-block w-24 h-[22px]"
                />
                <Badge className="cursor-pointer" onClick={handleAddHero}>
                  Add
                  <Check />
                </Badge>
              </div>
            </div>

            {/* Villain Section */}
            <div>
              <div className="flex gap-1 items-center flex-wrap">
                <Badge className="font-mono font-semibold">Villain</Badge>
                {selectedMeme.villains && selectedMeme.villains.length > 0 ? (
                  <>
                    {selectedMeme.villains.map((villainItem, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-1 py-[1px] rounded-3xl border border-gray-300">
                        <span className="text-sm">{villainItem}</span>
                        <XCircle
                          className="cursor-pointer text-red-500 size-3"
                          onClick={() => handleRemoveVillain(villainItem)}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <Badge variant="outline">No villains assigned</Badge>
                )}
                <Input
                  value={villain}
                  onChange={(e) => setVillain(e.target.value)}
                  className="inline-block w-24 h-[22px]"
                />
                <Badge className="cursor-pointer" onClick={handleAddVillain}>
                  Add
                  <Check />
                </Badge>
              </div>
            </div>

            {/* Victim Section */}
            <div>
              <div className="flex gap-1 items-center flex-wrap">
                <Badge className="font-mono font-semibold">Victim</Badge>
                {selectedMeme.victims && selectedMeme.victims.length > 0 ? (
                  <>
                    {selectedMeme.victims.map((victimItem, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-1 py-[1px] rounded-3xl border border-gray-300">
                        <span className="text-sm">{victimItem}</span>
                        <XCircle
                          className="cursor-pointer text-red-500 size-3"
                          onClick={() => handleRemoveVictim(victimItem)}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <Badge variant="outline">No victims assigned</Badge>
                )}
                <Input
                  value={victim}
                  onChange={(e) => setVictim(e.target.value)}
                  className="inline-block w-24 h-[22px]"
                />
                <Badge className="cursor-pointer" onClick={handleAddVictim}>
                  Add
                  <Check />
                </Badge>
              </div>
            </div>

            {/* Other Roles Section */}
            <div>
              <div className="flex gap-1 items-center flex-wrap">
                <Badge className="font-mono font-semibold">Other Roles</Badge>
                {selectedMeme.other_roles && selectedMeme.other_roles.length > 0 ? (
                  <>
                    {selectedMeme.other_roles.map((roleItem, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-1 py-[1px] rounded-3xl border border-gray-300">
                        <span className="text-sm">{roleItem}</span>
                        <XCircle
                          className="cursor-pointer text-red-500 size-3"
                          onClick={() => handleRemoveOtherRole(roleItem)}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <Badge variant="outline">No other roles assigned</Badge>
                )}
                <Input
                  value={otherRole}
                  onChange={(e) => setOtherRole(e.target.value)}
                  className="inline-block w-24 h-[22px]"
                />
                <Badge className="cursor-pointer" onClick={handleAddOtherRole}>
                  Add
                  <Check />
                </Badge>
              </div>
            </div>
          </div>

          <Button
            className="w-full cursor-pointer"
            disabled={isAnnotating}
            onClick={handleGenerateAnnotation}
          >
            {isAnnotating ? "Generating Annotation..." : "Generate Annotation"}
          </Button>
        </div>

        <Separator className="my-4" />

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