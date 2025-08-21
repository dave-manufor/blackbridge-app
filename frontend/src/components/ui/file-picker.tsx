import { DragEvent, MouseEventHandler } from "react";
import { FaPlus } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import styles from "./file-picker.module.css";
import { FaFileUpload } from "react-icons/fa";
import { FaFolder } from "react-icons/fa6";
import { Button } from "./button";

/**
 * FilePicker component allows users to select files from their device or drag and drop files into the designated area.
 *
 * @param {Object} props - The properties object.
 * @param {string} [props.className] - Optional CSS class to apply to the component.
 * @param {Object} [props.style] - Optional inline styles to apply to the component.
 * @param {string} [props.accept] - Optional file types to accept, specified as a comma-separated list of MIME types or file extensions.
 * @param {boolean} [props.multiple] - Optional flag to allow multiple file selection.
 * @param {boolean} [props.directory] - Optional flag to allow directory selection.
 * @param {boolean} [props.draggable] - Optional flag to enable drag-and-drop functionality.
 * @param {React.ReactNode} [props.children] - Optional children to render inside the component.
 * @param {function(FileList): void} [props.onFileChange] - Callback function to handle file selection changes.
 *
 * @returns {JSX.Element} The rendered FilePicker component.
 */
export const FilePicker = ({
  className,
  style,
  accept,
  multiple,
  directory,
  draggable,
  children,
  onFileChange,
}: {
  className?: string;
  style?: React.CSSProperties;
  accept?: string;
  multiple?: boolean;
  directory?: boolean;
  draggable?: boolean;
  children?: React.ReactNode;
  onFileChange: (files: FileList) => void;
}) => {
  // const [dragging, setDragging] = useState(false);

  const handleClick: MouseEventHandler = (e) => {
    e.stopPropagation();

    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept || "*/*";
    input.multiple = Boolean(multiple);
    input.webkitdirectory = Boolean(directory);
    input.onchange = () => {
      const files = input.files;
      if (files) {
        onFileChange(files);
      }
    };
    input.click();
    input.remove();
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    // setDragging(true);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    // setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    // setDragging(false);

    if (e.dataTransfer?.types.includes("Files")) {
      onFileChange?.(e.dataTransfer.files);
    }
  };

  const dragProps = draggable
    ? {
        onDragEnter: handleDragEnter,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
      }
    : {};

  return (
    <div
      style={style}
      className={className}
      onClick={handleClick}
      {...dragProps}
    >
      {children || <FaPlus />}
    </div>
  );
};

/**
 * StyledFilePicker component allows users to select files with various customization options.
 *
 * @param {Object} props - The properties object.
 * @param {string} [props.variant=""] - The variant style of the file picker (e.g., "primary", "neutral", "ghost").
 * @param {boolean} [props.secondary=false] - If true, applies secondary styling to the button.
 * @param {string} props.info - Additional information or instructions for the file picker.
 * @param {string} props.error - Error message to display when file selection fails.
 * @param {string} [props.className] - Optional CSS class to apply to the component.
 * @param {Object} [props.style] - Optional inline styles to apply to the component.
 * @param {string} [props.accept] - Optional file types to accept, specified as a comma-separated list of MIME types or file extensions.
 * @param {boolean} [props.multiple] - Optional flag to allow multiple file selection.
 * @param {boolean} [props.directory] - Optional flag to allow directory selection.
 * @param {boolean} [props.draggable] - Optional flag to enable drag-and-drop functionality.
 * @param {function(FileList): void} [props.onFileChange] - Optional callback function to handle file selection changes.
 *
 * @returns {JSX.Element} The StyledFilePicker component.
 */
export const StyledFilePicker = ({
  variant,
  secondary = false,
  info,
  error,
  className,
  style,
  accept,
  multiple = false,
  directory = false,
  draggable = false,
  onFileChange,
}: {
  variant?: "primary" | "neutral" | "ghost";
  secondary?: boolean;
  info?: string;
  error?: string;
  className?: string;
  style?: React.CSSProperties;
  accept?: string;
  multiple?: boolean;
  directory?: boolean;
  draggable?: boolean;
  onFileChange: (files: FileList) => void;
}) => {
  const DEFAULT_VARIANT = "primary";
  const variants = {
    primary: {
      wrapper: styles.primary,
      button: `${secondary ? "secondary" : "primary"}--orange`,
    },
    neutral: {
      wrapper: styles.neutral,
      button: `${secondary ? "secondary" : "primary"}--neutral`,
    },
    ghost: {
      wrapper: styles.ghost,
      button: "ghost",
    },
  };
  return (
    <FilePicker
      className={cn(
        styles.filePicker,
        variants[variant || DEFAULT_VARIANT]?.wrapper,
        className,
        {
          [styles.draggable]: draggable,
        }
      )}
      style={style}
      accept={accept}
      multiple={multiple}
      directory={directory}
      draggable={draggable}
      onFileChange={onFileChange}
    >
      {draggable ? (
        <>
          <div className={styles.upload}>
            <FaFileUpload />
          </div>
          <h4>
            {`Drop your ${multiple ? "files" : "file"} here or `}
            <span className={styles.browse}>browse</span>
          </h4>
          {info && (
            <span className={cn("small-text", styles.info)}>{info}</span>
          )}
          {error && <span className="small-text !text-red-500">{error}</span>}
        </>
      ) : (
        <>
          <Button
            type="button"
            className={cn(
              "sm w-full",
              variants[variant || DEFAULT_VARIANT]?.button
            )}
          >
            <FaFolder /> Browse Files
          </Button>
          {info && <span className="small-text pt-[8px]">{info}</span>}
          {error && (
            <span className="small-text pt-[8px] !text-red-500">{error}</span>
          )}
        </>
      )}
    </FilePicker>
  );
};
