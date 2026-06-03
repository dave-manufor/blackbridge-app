import { useDownloadStore } from "@/stores/downloadStore";
import { IoIosArrowDown } from "react-icons/io";
import { useShallow } from "zustand/react/shallow";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { FaRegFile, FaRegFileZipper } from "react-icons/fa6";
import CircularProgress from "@mui/material/CircularProgress";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

// const dummyEvents = new Map([
//   [
//     "id1",
//     {
//       id: "id1",
//       name: "Annual_Report_2023.pdf jdkjalvhjgdhdhvshdaljfghdjhvgdhls",
//       mode: "direct",
//       totalBytes: 2450000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id2",
//     {
//       id: "id2",
//       name: "Team_Photo.jpg",
//       mode: "direct",
//       totalBytes: 1200000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id3",
//     {
//       id: "id3",
//       name: "Presentation_Slides.pptx",
//       mode: "zip",
//       totalBytes: 3400000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id4",
//     {
//       id: "id4",
//       name: "Invoice_March.xlsx",
//       mode: "direct",
//       totalBytes: 800000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id5",
//     {
//       id: "id5",
//       name: "Logo_Design.ai",
//       mode: "direct",
//       totalBytes: 1500000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id6",
//     {
//       id: "id6",
//       name: "User_Manual.pdf",
//       mode: "zip",
//       totalBytes: 2100000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id7",
//     {
//       id: "id7",
//       name: "Contract_Agreement.docx",
//       mode: "direct",
//       totalBytes: 900000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id8",
//     {
//       id: "id8",
//       name: "Product_Catalogue.pdf",
//       mode: "zip",
//       totalBytes: 3200000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id9",
//     {
//       id: "id9",
//       name: "Backup_2024_06_01.zip",
//       mode: "zip",
//       totalBytes: 5000000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id10",
//     {
//       id: "id10",
//       name: "Resume_JohnDoe.pdf",
//       mode: "direct",
//       totalBytes: 600000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id11",
//     {
//       id: "id11",
//       name: "Meeting_Recording.mp4",
//       mode: "zip",
//       totalBytes: 8000000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id12",
//     {
//       id: "id12",
//       name: "Design_Mockup.sketch",
//       mode: "direct",
//       totalBytes: 2500000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id13",
//     {
//       id: "id13",
//       name: "Data_Export.csv",
//       mode: "direct",
//       totalBytes: 400000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id14",
//     {
//       id: "id14",
//       name: "Release_Notes.txt",
//       mode: "direct",
//       totalBytes: 100000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id15",
//     {
//       id: "id15",
//       name: "Marketing_Video.mov",
//       mode: "zip",
//       totalBytes: 12000000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id16",
//     {
//       id: "id16",
//       name: "Source_Code.tar.gz",
//       mode: "zip",
//       totalBytes: 3500000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id17",
//     {
//       id: "id17",
//       name: "Profile_Picture.png",
//       mode: "direct",
//       totalBytes: 700000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id18",
//     {
//       id: "id18",
//       name: "Financial_Statement_2023.xlsx",
//       mode: "direct",
//       totalBytes: 1100000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id19",
//     {
//       id: "id19",
//       name: "App_Installer.exe",
//       mode: "zip",
//       totalBytes: 9000000,
//       progressMap: new Map(),
//     },
//   ],
//   [
//     "id20",
//     {
//       id: "id20",
//       name: "Research_Paper.pdf",
//       mode: "direct",
//       totalBytes: 1300000,
//       progressMap: new Map(),
//     },
//   ],
// ]);

const DownloadsDrawer = () => {
  const [open, setOpen] = useState(true);
  const { events, getEventProgress } = useDownloadStore(
    useShallow((state) => ({
      events: state.events,
      getEventProgress: state.getEventProgress,
    }))
  );

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <Card
      initial={{
        transform: "translateY(100%)",
      }}
      animate={{
        transform:
          events.size > 0 && open
            ? "translateY(0)"
            : "translateY(calc(100% - 56px))",
      }}
      className={cn(
        "border rounded-bl-none rounded-br-none fixed bottom-0 right-0 mr-6 w-96 p-0 gap-0 overflow-hidden max-sm:mx-0 max-sm:right-1/2 max-sm:translate-x-1/2 bg-white shadow-2xl",
        { "translate-y-full": events.size === 0 }
      )}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 h-14 shadow-sm">
        <span className="text-md font-medium">Downloads</span>
        <Button variant={"ghost"} onClick={toggleOpen}>
          <IoIosArrowDown
            className={cn("transition-transform", {
              "transform rotate-180": open,
            })}
          />
        </Button>
      </div>
      <motion.div
        className={cn("w-full flex flex-col max-h-65 overflow-y-auto")}
      >
        <AnimatePresence>
          {Array.from(events.values()).map((event) => {
            const progress = getEventProgress(event.id);

            return (
              <motion.div
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring" }}
                key={event.id}
                className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 last:border-b-0"
              >
                <div className="flex items-center gap-2 max-w-[calc(100%-56px)]">
                  <div className="min-w-fit">
                    {event.mode === "zip" ? <FaRegFileZipper /> : <FaRegFile />}
                  </div>
                  <span
                    className={cn("truncate", {
                      "line-through": event.hasError,
                    })}
                  >
                    {event.name}
                  </span>
                </div>
                <div className="size-6 relative">
                  {!event.hasError && progress < 100 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-1/2">
                      <CircularProgress
                        className={cn("!size-5 text-neutral-400", {
                          "text-neutral-950": progress > 0,
                        })}
                        color="inherit"
                        variant={progress > 0 ? "determinate" : "indeterminate"}
                        value={progress > 0 ? progress : undefined}
                      />
                    </div>
                  )}
                  {!event.hasError && progress >= 100 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-1/2">
                      <FaCheckCircle className="size-5 text-green-400 " />
                    </div>
                  )}
                  {event.hasError && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-1/2">
                      <FaExclamationCircle className="size-5 text-red-400 " />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </Card>
  );
};

export default DownloadsDrawer;
