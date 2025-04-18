'use client';

import CloseButton from '@/components/CloseButton';
import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReportsPage = () => {
  const navigate = useNavigate();
  
  return (
    <Page>
      <Container id='reportsPage'>
        <PageTitle>
          <CloseButton onClose={() => navigate(-1)} className='md:block w-fit top-0 text-lg py-1 text-stone-400 relative border-none' text='Back' />
          Report a bug
        </PageTitle>
      </Container>
    </Page>
  )
}

export default ReportsPage;