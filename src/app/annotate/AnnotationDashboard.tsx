"use client";

import { AnnotatedMeme } from "@/types/models";
import MemeListPreview from "./MemeListPreview";
import { useState } from "react";
import { AnnotateMeme } from "./AnnotateMeme";

interface AnnotationDashboardProps {
  memes: AnnotatedMeme[];
}

export default function AnnotationDashboard({
  memes: initialMemes,
}: AnnotationDashboardProps) {
  const [memes, setMemes] = useState<AnnotatedMeme[]>(initialMemes);
  const [selectedMeme, setSelectedMeme] = useState<AnnotatedMeme>(memes[0]);

  const updateMeme = (updatedMeme: AnnotatedMeme) => {
    setMemes((prevMemes) =>
      prevMemes.map((meme) => (meme.id === updatedMeme.id ? updatedMeme : meme))
    );
    setSelectedMeme(updatedMeme);
  };

  return (
    <div className="flex justify-between px-4 gap-6 overflow-x-hidden">
      <MemeListPreview
        memes={memes}
        selectedMeme={selectedMeme}
        setSelectedMeme={setSelectedMeme}
      />
      <div className="flex-1">
        <AnnotateMeme
          memes={memes}
          selectedMeme={selectedMeme}
          setSelectedMeme={setSelectedMeme}
          updateMeme={updateMeme}
        />
      </div>
    </div>
  );
}
