import CloseButton from '@/components/CloseButton';
import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const WatchListPage = () => {
  const navigate = useNavigate();
  
  return (
    <Page>
      <Container id='watchListPage'>
        <PageTitle>
          <CloseButton onClose={() => navigate(-1)} className='md:block w-fit top-0 text-lg py-1 text-stone-400 relative border-none' text='Back' />
          Watch list
        </PageTitle>
      </Container>
    </Page>
  )
}

export default WatchListPage;