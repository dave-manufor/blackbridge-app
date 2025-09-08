import React from 'react';
import { Button } from '@react-email/components';

const StyledButton = ({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & React.ComponentPropsWithoutRef<typeof Button>) => {
  return (
    <Button {...props} className={`${className ? className : ''} bg-primary px-8 py-4 rounded-lg font-semibold text-sm text-white`}>
      {children}
    </Button>
  );
};

export default StyledButton;
