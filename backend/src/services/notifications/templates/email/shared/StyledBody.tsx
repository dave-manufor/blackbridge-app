import React from 'react';
import { Body } from '@react-email/components';

const StyledBody = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <Body className={`font-sans bg-white mx-auto my-auto ${className ? className : ''}`}>{children}</Body>;
};

export default StyledBody;
