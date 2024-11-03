import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BingoBoardComponent } from "./bingo-board/bingo-board.component";
import { HomeComponentComponent } from './home-component/home-component.component';
import { CreateGameComponent } from './create-game/create-game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BingoBoardComponent, HomeComponentComponent, CreateGameComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  title = 'mingo-app';
}
