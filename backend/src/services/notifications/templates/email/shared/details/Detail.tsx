import React from 'react';

const Detail = ({ title, value }: { title: string; value: string }) => (
  <tr>
    <td>
      <DetailTitle>{title}</DetailTitle>
    </td>
    <td>
      <DetailValue>{value}</DetailValue>
    </td>
  </tr>
);

const DetailTitle = ({ children }: { children: React.ReactNode }) => <span className="font-bold text-sm">{children}:</span>;

const DetailValue = ({ children }: { children: React.ReactNode }) => <span className="text-sm">{children}</span>;

export default Detail;
