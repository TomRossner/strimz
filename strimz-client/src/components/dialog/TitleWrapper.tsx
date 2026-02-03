import React from 'react';

interface TitleWrapperProps {
  title: string;
}

const TitleWrapper = ({ title }: TitleWrapperProps) => {
  return (
    <div className="flex justify-between w-full items-start">
      <h2 className="text-2xl font-semibold text-slate-200 py-1">{title}</h2>
    </div>
  );
};

export default TitleWrapper;