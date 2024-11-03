import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-game',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-game.component.html',
  styleUrls: ['./create-game.component.css']
})
export class CreateGameComponent implements OnInit {
  gameForm!: FormGroup;

  constructor(private fb: FormBuilder, private firestore: Firestore) {}

  ngOnInit(): void {
    console.log(this.generateGameCode());
    this.gameForm = this.fb.group({
      squares: this.fb.array(Array(25).fill('').map(() => this.fb.control('', Validators.required)))
    });
  }

  get squares(): FormArray {
    return this.gameForm.get('squares') as FormArray;
  }

  generateGameCode(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase(); // Generates a 4-character alphanumeric code
  }

  async saveGame(): Promise<void> {
    if (this.gameForm.valid) {
      const gameCode = this.generateGameCode();
      const squaresData = this.squares.value;

      const gamesCollection = collection(this.firestore, 'games');
      await addDoc(gamesCollection, {
        code: gameCode,
        squares: squaresData
      });
      console.log('Game saved with code:', gameCode);
    } else {
      console.log('Form is not valid');
    }
  }
}
