import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-game',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-game.component.html',
  styleUrls: ['./create-game.component.css']
})
export class CreateGameComponent implements OnInit {
  gameForm!: FormGroup;

  constructor(private fb: FormBuilder, 
              private firestore: Firestore,
              private router: Router) {}

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
      const gameData = {
        squares: this.gameForm.value.squares,
        createdAt: new Date(),
      };

      // Generate a unique code to use as the document ID
      const gameCode = this.generateGameCode();

      try {
        const gameRef = doc(this.firestore, 'games', gameCode);
        await setDoc(gameRef, gameData);

        console.log(`Game saved with code: ${gameCode}`);
        this.router.navigate(['/']); //Navigate home
      } catch (error) {
        console.error('Error saving game:', error);
      }
    }
  }

}
