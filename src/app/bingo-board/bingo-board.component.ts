import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';


interface BingoCell {
  square: string;
  marked: boolean;
}

@Component({
  selector: 'app-bingo-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bingo-board.component.html',
  styleUrls: ['./bingo-board.component.css']
})
export class BingoBoardComponent implements OnInit {
  gameData: any;
  hasBingo: boolean = false;

  constructor(private firestore: Firestore,
              private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const gameCode = params['code'];
      console.log('GameCode: ', gameCode);
      if (gameCode) {
        this.fetchGameById(gameCode);
      }
    });
  }

  async fetchGameById(gameCode: string): Promise<void> {
    try {
      const gameRef = doc(this.firestore, 'games', gameCode);
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        const shuffled = this.shuffleArray(gameSnap.data()['squares']);
        console.log(shuffled);
        this.gameData = {
          squares: Array(25).fill(null).map((_, i) => ({
            value: shuffled[i],
            selected: false
          }))
        };
      } else {
        console.log('No such game found!');
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    }
  }

  shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  }

  toggleSelection(index: number): void {
    console.log('toggle', index);
    this.gameData.squares[index].selected = !this.gameData.squares[index].selected;
    this.hasBingo = this.checkBingo();
  }

  checkBingo(): boolean {
    const size = 5; // Assuming a 5x5 grid
  
    // Check rows for bingo
    for (let row = 0; row < size; row++) {
      if (this.gameData.squares.slice(row * size, (row + 1) * size).every((square: any) => square.selected)) {
        return true;
      }
    }
  
    // Check columns for bingo
    for (let col = 0; col < size; col++) {
      if (Array.from({ length: size }).every((_, row) => this.gameData.squares[row * size + col].selected)) {
        return true;
      }
    }
  
    // Check first diagonal for bingo
    if (Array.from({ length: size }).every((_, i) => this.gameData.squares[i * (size + 1)].selected)) {
      return true;
    }
  
    // Check second diagonal for bingo
    if (Array.from({ length: size }).every((_, i) => this.gameData.squares[(i + 1) * (size - 1)].selected)) {
      return true;
    }
  
    return false;
  }


}
