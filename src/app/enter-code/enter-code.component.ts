import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-enter-code',
  templateUrl: './enter-code.component.html',
  styleUrls: ['./enter-code.component.css'],
  standalone: true,
  imports: [FormsModule]
})
export class EnterCodeComponent {
  gameCode: string = '';

  constructor(private router: Router) {}

  onSubmit(): void {
    if (this.gameCode.trim()) {
      // Navigate to the game board with the entered game code
      this.router.navigate(['/bingo-board', this.gameCode]);
    } else {
      alert('Please enter a valid game code.');
    }
  }
}
