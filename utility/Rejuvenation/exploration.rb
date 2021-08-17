require 'json'

# 1/ "nil definition" of a PokeBattle_Pokemon
# 
# Returns nil for every method -> if nil is returned it is the default value
# and it should not be computed in the output
#
# We do this to make Ruby happy, and PokemonMultipleForms.rb extends the methods
# of this class. We use instead the individual class that is more minimalistic
class PokeBattle_Pokemon
  def baseStats
    return nil
  end

  def ability
    return nil
  end

  def type1
    return nil
  end

  def type2
    return nil
  end

  def height
    return nil
  end

  def weight
    return nil
  end

  def evYield
    return nil
  end

  def getMoveList
    return nil
  end

  def isCompatibleWithMove?
    raise "is Compatible With Move was called"
  end

  def wildHoldItems
    return nil
  end

  def baseExp
    raise "baseExp was called"
  end
end

def getConst(_, key)
  return key
end

def getID(_, key)
  return key
end

def isConst?(_, _, _)
  return true
end

module PBTypes
  STEEL = :STEEL
end

PBItems = ""

# 2/ Import Rejuvenation "resource" script files
require "./PBEvent.rb"
require "./PokemonMultipleForms.rb";

# 3/ Break encapsulation to be able to iterate on every specie without issue
module MultipleForms
  def self.getAll
    return @@formSpecies
  end
end

class HandlerHash
  def getAll
    return @hash
  end
end

# 4/ Simple Pokemon Individual definition
#
# It is a simplification of the PokeBattle_Pokemon class
class Individual
  attr_accessor :form
  attr_accessor :item

  def initialize(specie, form, gender)
    @specie = specie
    @form = form
    @gender = gender
  end

  def species
    return @specie
  end

  def form
    return @form
  end

  def item
    return 0
  end

  
end

# 5/ Build output
def addIfNotNil(dict, key, value, individual)
  trueValue = MultipleForms.call(value, individual)
  if trueValue != nil
    dict[key] = trueValue
  end
end


MultipleForms.getAll.getAll.each do |key, value|
  # The POWERUPPUNCH and FUTURESIGHT constants probably makes the game crash
  # I don't own yet a Galarian Darmanitan so I can't check this.
  # Also Galarian Zed Mode Darmanitan gets form 0 Darmanitan stats
  doNotComputeMoveCompatibilityOfForm2 = key === :DARMANITAN

  # We are facing an
  
  # check gender 0 (male) and 1 (female)

  for form in 0..30
    for gender in 0..1
      individual = Individual.new(key, form, gender)

      entry = {}
      
      entry[:specie] = key
      entry[:form] = form
      if gender == 0
        entry[:gender] = "male"
      else
        entry[:gender] = "female"
      end

      addIfNotNil(entry, :type1, "type1", individual)
      addIfNotNil(entry, :type2, "type2", individual)
      addIfNotNil(entry, :baseStats, "getBaseStats", individual)

      if entry.length != 3
        puts(entry.to_json)
      end
    end
  end


  "getBaseStats"
  "getMoveList"
  "ability" # pokemon.abilityflag -> check with 0 1 2 (3 4 5?)
  "getMoveCompatibility" # if !doNotComputeMoveCompatibilityOfForm2 && !form 2
  "getEggMoves"


  # "onSetForm" -> add what is learned through pbLearnMove


# MultipleForms.register(:SILVALLY,{
end







#charizard = Individual.new
#print MultipleForms.call("getMoveCompatibility", charizard)
