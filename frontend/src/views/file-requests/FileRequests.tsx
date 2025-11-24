import React from "react";
import FileRequestList from "./FileRequestList";
import FileRequestCreate from "./FileRequestCreate";
import FileRequestDetails from "./FileRequestDetails";
import { Routes, Route } from "react-router";

const FileRequests: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<FileRequestList />} />
      <Route path="create" element={<FileRequestCreate />} />
      <Route path=":requestId" element={<FileRequestDetails />} />
    </Routes>
  );
};

export default FileRequests;
