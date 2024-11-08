import { Routes } from '@angular/router';
import { CreateGameComponent } from './create-game/create-game.component';
import { BingoBoardComponent } from './bingo-board/bingo-board.component';
import { HomeComponentComponent } from './home-component/home-component.component';
import { EnterCodeComponent } from './enter-code/enter-code.component';

export const routes: Routes = [
  { path: 'create-game', component: CreateGameComponent },
  { path: 'bingo-board/:gameCode', component: BingoBoardComponent },
  { path: 'home', component: HomeComponentComponent},
  { path: 'enter-code', component: EnterCodeComponent },
//   { path: '', redirectTo: '/home', pathMatch: 'full' }, // Optional default route
//   { path: '**', redirectTo: '/home' } 
];