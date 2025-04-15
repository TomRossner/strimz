import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import React from 'react';

const FavoritesPage = () => {
  return (
    <Page>
      <Container id='favoritesPage'>
        <PageTitle>Favorites</PageTitle>
      </Container>
    </Page>
  )
}

export default FavoritesPage;