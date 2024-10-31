import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BingoBoardComponent } from "./bingo-board/bingo-board.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BingoBoardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'mingo-app';
}
