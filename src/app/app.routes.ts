import { Routes } from '@angular/router';
import { CreateGameComponent } from './create-game/create-game.component';
import { BingoBoardComponent } from './bingo-board/bingo-board.component';
import { HomeComponentComponent } from './home-component/home-component.component';

export const routes: Routes = [
  { path: 'create-game', component: CreateGameComponent },
  { path: 'bingo-board', component: BingoBoardComponent },
  { path: 'home', component: HomeComponentComponent},
  { path: '', redirectTo: '/home', pathMatch: 'full' }, // Optional default route
  { path: '**', redirectTo: '/home' } 
];